"use client";

import dynamic from "next/dynamic";

/** The workspace depends on today's date and the viewer's saved state, so it renders in the browser only. */
const Workspace = dynamic(() => import("./Demo"), {
  ssr: false,
  loading: () => <p className="wrap muted" style={{ paddingBlock: 48 }}>Loading your briefing…</p>,
});

export default function DemoLoader({ signUp }: { signUp?: boolean }) {
  return <Workspace signUp={signUp} />;
}
