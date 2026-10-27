"use client";

import { Analytics } from "@vercel/analytics/next";

/**
 * Vercel Web Analytics: anonymous page views, top pages, referrers, country and
 * device. No cookies. Admin pages aren't counted, and document links are reduced
 * to their page type so job ids don't end up in the stats.
 */
export default function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        const url = new URL(event.url);
        if (url.pathname.startsWith("/admin")) return null;
        if (url.pathname.startsWith("/app/doc/")) url.pathname = "/app/doc";
        url.search = "";
        return { ...event, url: url.toString() };
      }}
    />
  );
}
