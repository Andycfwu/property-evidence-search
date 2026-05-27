import { ArrowRight, Sparkles } from "lucide-react";
import { StatusBadge } from "./status-badge";

export function RecommendationCard({
  community,
  builder,
  confidence,
  explanation,
}: {
  community?: string;
  builder?: string;
  confidence?: string;
  explanation?: string;
}) {
  return (
    <section className="rounded-2xl border border-orange-100 bg-atlas-soft/60 p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="text-atlas" size={17} />
          <p className="text-sm font-semibold text-ink">Atlas recommendation</p>
        </div>
        {confidence && <StatusBadge value={confidence} />}
      </div>
      <dl className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Likely community</dt>
          <dd className="mt-1 text-sm font-semibold text-ink">{community ?? "No normalized candidate"}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Likely builder</dt>
          <dd className="mt-1 text-sm font-semibold text-ink">{builder ?? "Requires review"}</dd>
        </div>
      </dl>
      <p className="mb-4 text-xs leading-6 text-slate-600">{explanation ?? "Run evidence extraction to generate a cited candidate recommendation."}</p>
      <p className="flex items-center gap-2 text-xs font-semibold text-atlas"><ArrowRight size={13} /> Next move: validate cited sources and approve the review brief.</p>
    </section>
  );
}
