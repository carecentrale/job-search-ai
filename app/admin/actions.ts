"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { aiWaiting, freshFreeWeek, requireAdmin, setRole, setTester } from "@/lib/admin";
import { houseKeyAvailable } from "@/lib/ai";

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
  if (!houseKeyAvailable()) return;
  const waiting = await aiWaiting();
  const ids = waiting.map((w) => w.user_id);
  await freshFreeWeek(ids);
  for (const id of ids) await logActivity(id, "fresh_free_week", { by: admin.email ?? admin.userId });
  revalidatePath("/admin");
}
