import { withSeeker, readJson } from "@/lib/api";
import { logPageView, VIEWS } from "@/lib/activity";

/** POST /api/me/view { view }: the workspace reports which tab was opened, for the owner's admin timeline. */
export async function POST(req: Request) {
  return withSeeker(async (s) => {
    const { view } = await readJson<{ view?: string }>(req);
    if (view && (VIEWS as readonly string[]).includes(view)) await logPageView(s.id, view);
    return new Response(null, { status: 204 });
  });
}
