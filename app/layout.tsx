import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "fuzzyHR",
  description:
    "Your personal headhunter. fuzzyHR finds the roles worth your time, tailors your CV and cover letter for each, and keeps your search moving.",
};

/** Sign-up switches on once the Clerk keys are in Vercel; until then the site runs as a public demo. */
const clerkOn = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function RootLayout({ children }: LayoutProps<"/">) {
  const page = (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500;6..72,600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
  if (!clerkOn) return page;
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/app"
      signUpFallbackRedirectUrl="/app"
      afterSignOutUrl="/"
      appearance={{
        variables: {
          colorPrimary: "#1c5b47",
          fontFamily: '"Hanken Grotesk", "Segoe UI", system-ui, sans-serif',
          borderRadius: "10px",
        },
      }}
    >
      {page}
    </ClerkProvider>
  );
}
