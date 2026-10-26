import type { Metadata } from "next";
import WorkspaceLoader from "@/components/WorkspaceLoader";

export const metadata: Metadata = { title: "fuzzyHR workspace" };

export default function AppPage() {
  return <WorkspaceLoader />;
}
