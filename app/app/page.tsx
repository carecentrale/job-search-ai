import type { Metadata } from "next";
import { connection } from "next/server";
import DemoLoader from "@/components/workspace/DemoLoader";
import LiveWorkspace from "@/components/workspace/Live";
import { adminCaller, aiWaiting } from "@/lib/admin";
import { houseKeyAvailable } from "@/lib/house";
import { clerkEnabled, currentCaller } from "@/lib/auth";
import { hasDb } from "@/lib/db";

export const metadata: Metadata = { title: "fuzzyHR workspace" };

/** Signed in: your own workspace. Signed out: the demo, with a way to sign up once accounts are on. */
export default async function AppPage() {
  await connection(); // decided per visitor, never prebuilt
  const accountsOn = hasDb() && (clerkEnabled() || Boolean(process.env.FUZZY_DEV_USER && !process.env.VERCEL));
  const caller = accountsOn ? await currentCaller() : null;
  if (caller) {
    const isAdmin = Boolean(await adminCaller());
    // A dot on the Admin link when real users are waiting for free AI writing.
    const adminAlert = isAdmin && !(await houseKeyAvailable()) ? (await aiWaiting()).length : 0;
    return <LiveWorkspace clerk={clerkEnabled()} isAdmin={isAdmin} adminAlert={adminAlert} />;
  }
  return <DemoLoader signUp={hasDb() && clerkEnabled()} />;
}
