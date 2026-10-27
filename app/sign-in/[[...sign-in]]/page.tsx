import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import AuthFrame from "@/components/AuthFrame";

export const metadata = { title: "Sign in to fuzzyHR" };

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) redirect("/app");
  return (
    <AuthFrame title="Welcome back." lede="Your headhunter has been busy. Sign in to see this morning's briefing.">
      <SignIn />
    </AuthFrame>
  );
}
