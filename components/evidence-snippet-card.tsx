import { ExternalLink, FileText } from "lucide-react";
import Link from "next/link";
import { formatSourceType } from "@/lib/format";

export function EvidenceSnippetCard({
  title,
  sourceType,
  sourceUrl,
  score,
  snippet,
  href,
}: {
  title: string;
  sourceType?: string;
  sourceUrl: string | null;
  score?: number;
  snippet: string;
  href?: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-2">
          <FileText className="mt-0.5 text-atlas" size={15} />
          <div>
            {href ? <Link className="text-xs font-semibold text-ink hover:text-atlas" href={href}>{title}</Link> : <p className="text-xs font-semibold text-ink">{title}</p>}
            {sourceType && <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">{formatSourceType(sourceType)}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {score !== undefined && <span className="rounded-full bg-atlas-soft px-2 py-1 font-mono text-[11px] font-semibold text-atlas">Score {score.toFixed(1)}</span>}
          {sourceUrl && <a aria-label="Open source URL" className="text-atlas" href={sourceUrl} rel="noreferrer" target="_blank"><ExternalLink size={13} /></a>}
        </div>
      </div>
      <p className="text-xs leading-6 text-slate-600" dangerouslySetInnerHTML={{ __html: snippet }} />
    </article>
  );
}
