"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { aiWaiting, freshFreeWeek, requireAdmin, setRole, setTester } from "@/lib/admin";
import { houseKeyAvailable, removeHouseKey, saveHouseKey } from "@/lib/house";
import { connectStripe, disconnectStripe, savePlan } from "@/lib/billing";
import { siteUrl } from "@/lib/site";
import { productionDeployments, promote, removeVercelToken, rollbackTo, saveVercelToken } from "@/lib/deploys";

/** Make a user an admin, or take admin access away. Admins can't demote themselves, so the site always keeps one. */
export async function changeRole(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const role = formData.get("role") === "admin" ? "admin" : "user";
  if (!userId || (userId === admin.userId && role !== "admin")) return;
  await setRole(userId, role);
  await logActivity(userId, "role_changed", { to: role, by: admin.email ?? admin.userId });
  revalidatePath(`/admin/users/${encodeURIComponent(userId)}`);
  revalidatePath("/admin");
}

/** Mark someone as a tester (friends, test accounts): they don't count toward "time to add your key". */
export async function changeTester(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const tester = formData.get("tester") === "true";
  if (!userId) return;
  await setTester(userId, tester);
  await logActivity(userId, "tester_changed", { tester, by: admin.email ?? admin.userId });
  revalidatePath(`/admin/users/${encodeURIComponent(userId)}`);
  revalidatePath("/admin");
}

/** Once fuzzyHR's key is on: give everyone who was waiting a fresh 7-day free week, starting now. */
export async function giveFreshFreeWeek() {
  const admin = await requireAdmin();
  if (!(await houseKeyAvailable())) return;
  const waiting = await aiWaiting();
  const ids = waiting.map((w) => w.user_id);
  await freshFreeWeek(ids);
  for (const id of ids) await logActivity(id, "fresh_free_week", { by: admin.email ?? admin.userId });
  revalidatePath("/admin");
}

export type KeyFormState = { ok: boolean; message: string } | null;

/** Save fuzzyHR's own AI key from the admin panel. The key is checked, encrypted, and never shown again. */
export async function setHouseKeyAction(_prev: KeyFormState, formData: FormData): Promise<KeyFormState> {
  const admin = await requireAdmin();
  const result = await saveHouseKey(String(formData.get("apiKey") ?? ""), admin.email ?? admin.userId);
  await logActivity(admin.userId, "house_key_changed", { action: result.ok ? "set" : "rejected", message: result.ok ? undefined : result.message });
  revalidatePath("/admin");
  revalidatePath("/app");
  return result;
}

export async function removeHouseKeyAction() {
  const admin = await requireAdmin();
  await removeHouseKey();
  await logActivity(admin.userId, "house_key_changed", { action: "removed" });
  revalidatePath("/admin");
  revalidatePath("/app");
}

/** Connect Stripe from Admin → Payments. The key is checked, encrypted and never shown again. */
export async function connectStripeAction(_prev: KeyFormState, formData: FormData): Promise<KeyFormState> {
  const admin = await requireAdmin();
  const result = await connectStripe(String(formData.get("stripeKey") ?? ""), admin.email ?? admin.userId, await siteUrl());
  await logActivity(admin.userId, "billing_settings", { action: result.ok ? "stripe_connected" : "stripe_rejected", message: result.ok ? undefined : result.message });
  revalidatePath("/admin/billing");
  return result;
}

export async function disconnectStripeAction() {
  const admin = await requireAdmin();
  await disconnectStripe();
  await logActivity(admin.userId, "billing_settings", { action: "stripe_disconnected" });
  revalidatePath("/admin/billing");
}

const dollars = (v: FormDataEntryValue | null) => Math.round(Number(String(v ?? "").replace(",", ".")) * 100);
const whole = (v: FormDataEntryValue | null) => Math.round(Number(v ?? 0));

/** Save the Personal plan's prices and limits, and whether it's on sale. */
export async function savePlanAction(_prev: KeyFormState, formData: FormData): Promise<KeyFormState> {
  const admin = await requireAdmin();
  const plan = {
    priceCad: dollars(formData.get("priceCad")),
    priceUsd: dollars(formData.get("priceUsd")),
    appsPerMonth: whole(formData.get("appsPerMonth")),
    dailyRequests: whole(formData.get("dailyRequests")),
    selling: formData.get("selling") === "on",
  };
  if (![plan.priceCad, plan.priceUsd, plan.appsPerMonth, plan.dailyRequests].every(Number.isFinite)) return { ok: false, message: "Use numbers only." };
  let result: { ok: boolean; message: string };
  try {
    result = await savePlan(plan, admin.email ?? admin.userId);
  } catch (e) {
    result = { ok: false, message: `Stripe refused: ${(e as Error).message}` };
  }
  if (result.ok && plan.selling && !(await houseKeyAvailable())) {
    result = { ok: true, message: "Saved. Sales will open once fuzzyHR's AI key is set (Overview), since Personal runs on it." };
  }
  if (result.ok) await logActivity(admin.userId, "billing_settings", { action: "plan_saved", ...plan });
  revalidatePath("/admin/billing");
  revalidatePath("/");
  return result;
}

/** Connect Vercel from Admin → Versions, for rollbacks. */
export async function saveVercelTokenAction(_prev: KeyFormState, formData: FormData): Promise<KeyFormState> {
  const admin = await requireAdmin();
  const result = await saveVercelToken(String(formData.get("vercelToken") ?? ""), admin.email ?? admin.userId);
  await logActivity(admin.userId, "release_action", { action: result.ok ? "vercel_connected" : "vercel_rejected" });
  revalidatePath("/admin/versions");
  return result;
}

export async function removeVercelTokenAction() {
  const admin = await requireAdmin();
  await removeVercelToken();
  await logActivity(admin.userId, "release_action", { action: "vercel_disconnected" });
  revalidatePath("/admin/versions");
}

/** Roll back to the deployment just before the live one. */
export async function rollbackAction(_prev: KeyFormState, formData: FormData): Promise<KeyFormState> {
  const admin = await requireAdmin();
  const target = String(formData.get("deploymentId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || "Rolled back from fuzzyHR admin";
  try {
    const { deployments } = await productionDeployments();
    const d = deployments.find((x) => x.id === target);
    if (!d || d.state !== "READY") return { ok: false, message: "That deployment can't be rolled back to." };
    await rollbackTo(target, reason);
    await logActivity(admin.userId, "release_action", { action: "rollback", to: target, commit: d.sha?.slice(0, 7), message: d.message, reason });
    revalidatePath("/admin/versions");
    return { ok: true, message: "Rolled back. The site switches over within a minute. New pushes won't go live until you press Go live with latest." };
  } catch (e) {
    const status = (e as { status?: number }).status;
    const msg = (e as Error).message;
    return { ok: false, message: status === 402 || /upgrade to pro/i.test(msg) ? "Vercel's free plan can only roll back to the deployment just before the current one. For older versions, restore from git (see the steps below)." : `Vercel refused: ${msg}` };
  }
}

/** Undo a rollback: put the newest deployment live and resume automatic deploys. */
export async function goLiveLatestAction(_prev: KeyFormState, formData: FormData): Promise<KeyFormState> {
  const admin = await requireAdmin();
  const target = String(formData.get("deploymentId") ?? "");
  try {
    await promote(target);
    await logActivity(admin.userId, "release_action", { action: "promote", to: target });
    revalidatePath("/admin/versions");
    return { ok: true, message: "Done. The latest version is going live, and new pushes will go live automatically again." };
  } catch (e) {
    return { ok: false, message: `Vercel refused: ${(e as Error).message}` };
  }
}
