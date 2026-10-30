import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import AuthFrame from "@/components/AuthFrame";
import { getT } from "@/lib/locale";

export const metadata = { title: "Sign in to fuzzyHR" };

export default async function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) redirect("/app");
  const { t } = await getT();
  return (
    <AuthFrame title={t("Welcome back.")} lede={t("Your headhunter has been busy. Sign in to see this morning's briefing.")}>
      <SignIn />
    </AuthFrame>
  );
}
