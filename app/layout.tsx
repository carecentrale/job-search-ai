import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Search AI",
  description:
    "Paste a job posting and get a CV and cover letter rewritten for it. Free for 7 days.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=Source+Sans+3:wght@400;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
