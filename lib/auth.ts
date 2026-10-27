import "server-only";

/**
 * Who is calling. On the live site this is Clerk's signed-in user.
 *
 * For local testing only, FUZZY_DEV_USER stands in for a signed-in user. It is
 * ignored on Vercel (VERCEL is always set there), so it can never open the
 * live site to anyone.
 */

export function clerkEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

export type Caller = { userId: string; email: () => Promise<string | null> };

export async function currentCaller(): Promise<Caller | null> {
  if (clerkEnabled()) {
    const { auth, currentUser } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (!userId) return null;
    return {
      userId,
      email: async () => (await currentUser())?.primaryEmailAddress?.emailAddress ?? null,
    };
  }
  const dev = process.env.FUZZY_DEV_USER;
  if (dev && !process.env.VERCEL) return { userId: dev, email: async () => `${dev}@localhost` };
  return null;
}
