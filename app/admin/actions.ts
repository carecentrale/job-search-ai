"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { aiWaiting, freshFreeWeek, requireAdmin, setRole, setTester } from "@/lib/admin";
import { houseKeyAvailable, removeHouseKey, saveHouseKey } from "@/lib/house";
import { connectStripe, disconnectStripe, savePlan } from "@/lib/billing";
import { siteUrl } from "@/lib/site";

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
