import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import AuthFrame from "@/components/AuthFrame";

export const metadata = { title: "Start your free week with fuzzyHR" };

export default function SignUpPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) redirect("/app");
  return (
    <AuthFrame
      title="Hire your headhunter."
      lede="Free for 7 days, with 5 tailored applications. No card needed. Next, you'll share your CV and tell it what you want."
    >
      <SignUp />
    </AuthFrame>
  );
}
