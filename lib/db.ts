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
