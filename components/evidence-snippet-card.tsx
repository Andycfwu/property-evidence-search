import { ExternalLink, FileText } from "lucide-react";
import Link from "next/link";
import { formatSourceType } from "@/lib/format";
import { StatusBadge } from "./status-badge";

export function EvidenceSnippetCard({
  title,
  sourceType,
  sourceUrl,
  score,
  snippet,
  href,
  sourceLayer,
  sourceTrust,
  retrievalMode,
  lexicalScore,
  semanticScore,
}: {
  title: string;
  sourceType?: string;
  sourceUrl: string | null;
  score?: number;
  snippet: string;
  href?: string;
  sourceLayer?: string;
  sourceTrust?: string;
  retrievalMode?: string;
  lexicalScore?: number;
  semanticScore?: number;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-2">
          <FileText className="mt-0.5 text-atlas" size={15} />
          <div>
            {href ? <Link className="text-xs font-semibold text-ink hover:text-atlas" href={href}>{title}</Link> : <p className="text-xs font-semibold text-ink">{title}</p>}
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {sourceType && <p className="text-[11px] uppercase tracking-wide text-slate-400">{formatSourceType(sourceType)}</p>}
              {sourceLayer && <StatusBadge value={sourceLayer} />}
              {sourceTrust === "VERIFIED" && <StatusBadge value={sourceTrust} />}
              {retrievalMode && <StatusBadge value={retrievalMode} />}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {score !== undefined && <span className="rounded-full bg-atlas-soft px-2 py-1 font-mono text-[11px] font-semibold text-atlas">Score {score.toFixed(retrievalMode && retrievalMode !== "LEXICAL" ? 3 : 1)}</span>}
          {sourceUrl && <a aria-label="Open source URL" className="text-atlas" href={sourceUrl} rel="noreferrer" target="_blank"><ExternalLink size={13} /></a>}
        </div>
      </div>
      {(lexicalScore !== undefined || semanticScore !== undefined) && (
        <p className="mb-2 flex gap-3 font-mono text-[11px] text-slate-400">
          {lexicalScore !== undefined && <span>Lexical {lexicalScore.toFixed(1)}</span>}
          {semanticScore !== undefined && <span>Semantic {semanticScore.toFixed(3)}</span>}
        </p>
      )}
      <p className="text-xs leading-6 text-slate-600" dangerouslySetInnerHTML={{ __html: snippet }} />
    </article>
  );
}
