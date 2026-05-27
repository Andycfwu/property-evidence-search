"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, FileText, MapPinned, Search, X } from "lucide-react";
import { useState } from "react";

const steps = [
  {
    title: "Source Library",
    text: "Ingest evidence by pasting listing text or fetching a readable public page.",
    href: "/documents/new",
    cta: "Stage sources",
    icon: FileText,
  },
  {
    title: "Search Evidence",
    text: "Verify that indexed snippets contain the address, community, and builder signals you expect.",
    href: "/search",
    cta: "Search snippets",
    icon: Search,
  },
  {
    title: "New Evidence Run",
    text: "Paste target addresses and start an Atlas research sprint over indexed sources.",
    href: "/jobs/new",
    cta: "Start run",
    icon: MapPinned,
  },
  {
    title: "Results",
    text: "Review normalized community and builder candidates, confidence, and source citations.",
    href: "/jobs",
    cta: "Open history",
    icon: BookOpen,
  },
] as const;

export function DemoFlowButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="button-secondary" onClick={() => setOpen(true)} type="button">Try Demo Flow</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 p-5" role="presentation" onMouseDown={() => setOpen(false)}>
          <section
            aria-labelledby="demo-flow-title"
            aria-modal="true"
            className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="mb-6 flex items-start justify-between gap-5">
              <div>
                <p className="atlas-kicker mb-2">Guided Demo</p>
                <h2 className="text-xl font-semibold tracking-tight text-ink" id="demo-flow-title">Four steps to an evidence brief</h2>
                <p className="mt-2 text-sm text-slate-500">Use the seeded examples or copy demo material as you walk through Atlas.</p>
              </div>
              <button aria-label="Close demo flow" className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:text-ink" onClick={() => setOpen(false)} type="button"><X size={16} /></button>
            </div>
            <ol className="space-y-3">
              {steps.map(({ title, text, href, cta, icon: Icon }, index) => (
                <li className="flex gap-4 rounded-2xl border border-slate-100 bg-[#FCFBF8] p-4" key={title}>
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-xs font-semibold text-atlas">{String(index + 1).padStart(2, "0")}</span>
                    <span className="rounded-xl bg-atlas-soft p-2 text-atlas"><Icon size={16} /></span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
                  </div>
                  <Link className="hidden items-center gap-1 self-center text-xs font-semibold text-atlas sm:flex" href={href} onClick={() => setOpen(false)}>
                    {cta} <ArrowRight size={12} />
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </>
  );
}
