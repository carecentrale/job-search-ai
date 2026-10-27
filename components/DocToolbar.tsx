"use client";

import Link from "next/link";
import { useState } from "react";

const TEMPLATES = [
  ["minimal", "Minimal"],
  ["bold", "Bold"],
  ["elegant", "Elegant"],
] as const;

/** Template switcher, copy buttons and Save as PDF (the browser's print dialog). */
export default function DocToolbar({
  id,
  template,
  company,
  cvText,
  letterText,
}: {
  id: string;
  template: string;
  company: string;
  cvText: string;
  letterText: string;
}) {
  const [copied, setCopied] = useState("");

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
    } catch {
      setCopied("Copy failed. Select the text on the page instead.");
    }
    setTimeout(() => setCopied(""), 2500);
  };

  return (
    <div className="doc-toolbar no-print">
      <div className="doc-toolbar-inner">
        <Link href="/app" className="textbtn">Back to tracker</Link>
        <span className="doc-title">{company}</span>
        <div className="doc-templates" role="group" aria-label="Template">
          {TEMPLATES.map(([key, label]) => (
            <Link key={key} href={`/app/doc/${encodeURIComponent(id)}?t=${key}`} className={key === template ? "on" : ""} aria-current={key === template ? "true" : undefined}>
              {label}
            </Link>
          ))}
        </div>
        <div className="doc-actions">
          <button className="btn btn-small btn-ghost" onClick={() => copy("CV copied", cvText)}>Copy CV</button>
          <button className="btn btn-small btn-ghost" onClick={() => copy("Cover letter copied", letterText)}>Copy letter</button>
          <button className="btn btn-small" onClick={() => window.print()}>Save as PDF</button>
        </div>
      </div>
      <p className="doc-status" role="status" aria-live="polite">{copied}</p>
    </div>
  );
}
