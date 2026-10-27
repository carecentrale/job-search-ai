import { logActivity } from "@/lib/activity";
import { ApiError, readJson, stateResponse, withSeeker } from "@/lib/api";
import { clerkEnabled } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteSeekerData } from "@/lib/seekers";

/** GET /api/me: the signed-in seeker's workspace. */
export async function GET() {
  return withSeeker((s) => stateResponse(s));
}

/**
 * DELETE /api/me { confirm: "DELETE" }: delete the account and everything stored
 * about it, here and in Clerk (the sign-in service). Not reversible.
 */
export async function DELETE(req: Request) {
  return withSeeker(async (s) => {
    const { confirm } = await readJson<{ confirm?: string }>(req);
    if (confirm !== "DELETE") throw new ApiError(400, "Type DELETE to confirm.");
    const sql = await db();
    const [{ admins }] = await sql<{ admins: number }[]>`select count(*)::int as admins from seekers where role = 'admin'`;
    const [me] = await sql<{ role: string }[]>`select role from seekers where user_id = ${s.id}`;
    if (me?.role === "admin" && admins <= 1) {
      throw new ApiError(409, "You're the only admin. Make someone else an admin first, so the site keeps an owner.");
    }
    const applications = s.applications.length;
    await deleteSeekerData(s.id);
    if (clerkEnabled()) {
      try {
        const { clerkClient } = await import("@clerk/nextjs/server");
        await (await clerkClient()).users.deleteUser(s.id);
      } catch (e) {
        console.error("clerk delete failed", (e as Error).message);
      }
    }
    // A record with no personal details, so the owner can see deletions happened.
    await logActivity("deleted-account", "account_deleted", { applications });
    return Response.json({ deleted: true });
  });
}
