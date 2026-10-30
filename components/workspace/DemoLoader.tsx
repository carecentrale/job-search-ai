"use client";

import dynamic from "next/dynamic";
import { useT } from "@/components/I18n";

/** The workspace depends on today's date and the viewer's saved state, so it renders in the browser only. */
const Workspace = dynamic(() => import("./Demo"), {
  ssr: false,
  loading: () => <Loading />,
});

function Loading() {
  const { t } = useT();
  return <p className="wrap muted" style={{ paddingBlock: 48 }}>{t("Loading your briefing…")}</p>;
}

export default function DemoLoader({ signUp }: { signUp?: boolean }) {
  return <Workspace signUp={signUp} />;
}
