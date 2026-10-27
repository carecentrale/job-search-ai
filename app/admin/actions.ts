"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { requireAdmin, setRole } from "@/lib/admin";

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
