import postgres from "postgres";

/**
 * Postgres connection, from DATABASE_URL (set by the Neon integration on Vercel).
 * Tables are created on first use, so there is no separate migration step.
 */

type Sql = ReturnType<typeof postgres>;

let sql: Sql | null = null;
let ready: Promise<void> | null = null;

export function hasDb(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function connect(url: string): Sql {
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  return postgres(url, {
    max: 3,
    idle_timeout: 20,
    // Neon's pooled endpoint does not support prepared statements.
    prepare: false,
    ssl: local ? false : "require",
    onnotice: () => {},
  });
}

async function migrate(db: Sql): Promise<void> {
  await db`
    create table if not exists seekers (
      user_id       text primary key,
      email         text,
      brief         jsonb,
      cv_text       text,
      applications  jsonb not null default '[]'::jsonb,
      passed        jsonb not null default '[]'::jsonb,
      matches       jsonb not null default '[]'::jsonb,
      extra_boards  jsonb not null default '[]'::jsonb,
      plan          text not null default 'trial',
      trial_ends_at timestamptz not null default now() + interval '7 days',
      last_hunt_at  timestamptz,
      created_at    timestamptz not null default now(),
      updated_at    timestamptz not null default now()
    )`;
  await db`
    create table if not exists briefings (
      user_id    text not null references seekers(user_id) on delete cascade,
      date       date not null,
      data       jsonb not null,
      created_at timestamptz not null default now(),
      primary key (user_id, date)
    )`;
  await db`alter table seekers add column if not exists claude_key_enc text`;
  await db`alter table seekers add column if not exists claude_key_last4 text`;
  await db`alter table seekers add column if not exists claude_key_added_at timestamptz`;
  await db`alter table seekers add column if not exists ai_provider text`;
  await db`alter table seekers add column if not exists ai_model text`;
  await db`alter table seekers add column if not exists last_seen_at timestamptz`;
  await db`alter table seekers add column if not exists role text not null default 'user'`;
  await db`alter table seekers add column if not exists agent jsonb`;
  await db`alter table seekers add column if not exists tester boolean not null default false`;
  await db`alter table seekers add column if not exists stripe_customer_id text`;
  await db`alter table seekers add column if not exists stripe_subscription_id text`;
  await db`alter table seekers add column if not exists subscription_status text`;
  await db`alter table seekers add column if not exists plan_currency text`;
  await db`alter table seekers add column if not exists period_start timestamptz`;
  await db`alter table seekers add column if not exists period_end timestamptz`;
  await db`alter table seekers add column if not exists cancel_at_period_end boolean not null default false`;
  await db`alter table seekers add column if not exists billing_paused boolean not null default false`;
  await db`alter table seekers add column if not exists paid_through timestamptz`;
  await db`alter table seekers add column if not exists resume_at timestamptz`;
  await db`alter table seekers add column if not exists hunting_paused boolean not null default false`;
  await db`alter table seekers add column if not exists got_job jsonb`;
  // The site owner is the first account ever created. If there's no admin yet, promote it.
  await db`
    update seekers set role = 'admin'
    where user_id = (select user_id from seekers order by created_at asc limit 1)
      and not exists (select 1 from seekers where role = 'admin')`;
  await db`
    create table if not exists activity (
      id      bigserial primary key,
      user_id text not null,
      at      timestamptz not null default now(),
      type    text not null,
      detail  jsonb not null default '{}'::jsonb
    )`;
  await db`create index if not exists activity_user_at on activity (user_id, at desc)`;
  await db`create index if not exists activity_at on activity (at desc)`;
  await backfillActivity(db);
  await db`
    create table if not exists claude_usage (
      user_id       text not null,
      day           date not null,
      source        text not null,
      calls         integer not null default 0,
      input_tokens  bigint not null default 0,
      output_tokens bigint not null default 0,
      primary key (user_id, day, source)
    )`;
}

/**
 * One time only: activity logging started after the first users joined, so rebuild
 * their earlier history from what's saved (account, CV, brief, hunts, applications,
 * documents). Every rebuilt event is marked `backfilled`; times are exact where saved,
 * otherwise approximate.
 */
async function backfillActivity(db: Sql): Promise<void> {
  await db`
    create table if not exists app_settings (
      name       text primary key,
      value      text not null,
      updated_at timestamptz not null default now(),
      updated_by text
    )`;
  await db`create table if not exists fuzzy_migrations (name text primary key, ran_at timestamptz not null default now())`;
  const claimed = await db`insert into fuzzy_migrations (name) values ('activity_backfill_v1') on conflict do nothing returning name`;
  if (claimed.length === 0) return;
  // Only history from before real logging began.
  const [{ cutoff }] = await db<{ cutoff: Date }[]>`select coalesce(min(at), now()) as cutoff from activity where not (detail ? 'backfilled')`;
  await db.begin(async (tx) => {
    await tx`
      insert into activity (user_id, at, type, detail)
      select user_id, created_at, 'signed_up', jsonb_build_object('email', email, 'backfilled', true)
      from seekers where created_at < ${cutoff}
        and not exists (select 1 from activity a where a.user_id = seekers.user_id and a.type = 'signed_up')`;
    await tx`
      insert into activity (user_id, at, type, detail)
      select user_id, created_at + interval '1 second', 'cv_uploaded',
        jsonb_build_object('format', 'unknown', 'chars', length(cv_text), 'backfilled', true, 'approxTime', true)
      from seekers where cv_text is not null and created_at < ${cutoff}`;
    await tx`
      insert into activity (user_id, at, type, detail)
      select user_id, created_at + interval '2 seconds', 'brief_saved',
        jsonb_build_object('roles', brief -> 'targetTitles', 'strengths', jsonb_array_length(coalesce(brief -> 'skills', '[]'::jsonb)),
          'cities', brief -> 'locations', 'remoteOk', brief -> 'remoteOk', 'avoid', brief -> 'avoid', 'backfilled', true, 'approxTime', true)
      from seekers where jsonb_array_length(coalesce(brief -> 'targetTitles', '[]'::jsonb)) > 0 and created_at < ${cutoff}`;
    await tx`
      insert into activity (user_id, at, type, detail)
      select user_id, created_at, 'hunt',
        jsonb_build_object('trigger', 'unknown', 'read', data -> 'postingsRead', 'found', jsonb_array_length(coalesce(data -> 'newMatches', '[]'::jsonb)), 'backfilled', true)
      from briefings where created_at < ${cutoff}`;
    await tx`
      insert into activity (user_id, at, type, detail)
      select s.user_id, (a ->> 'createdAt')::timestamptz, 'application_created',
        jsonb_build_object('company', a -> 'job' ->> 'company', 'title', a -> 'job' ->> 'title', 'fit', a -> 'job' -> 'fit', 'backfilled', true)
      from seekers s, jsonb_array_elements(s.applications) a
      where (a ->> 'createdAt')::timestamptz < ${cutoff}`;
    await tx`
      insert into activity (user_id, at, type, detail)
      select s.user_id, (a -> 'tailored' ->> 'createdAt')::timestamptz, 'documents_written',
        jsonb_build_object('company', a -> 'job' ->> 'company', 'title', a -> 'job' ->> 'title', 'model', a -> 'tailored' ->> 'model',
          'provider', case when a -> 'tailored' ->> 'model' like 'gpt%' then 'openai' else 'anthropic' end, 'backfilled', true)
      from seekers s, jsonb_array_elements(s.applications) a
      where a ? 'tailored' and (a -> 'tailored' ->> 'createdAt')::timestamptz < ${cutoff}`;
  });
}

export async function db(): Promise<Sql> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  if (!sql) sql = connect(url);
  if (!ready) {
    ready = migrate(sql).catch((e) => {
      ready = null; // retry on the next request
      throw e;
    });
  }
  await ready;
  return sql;
}
