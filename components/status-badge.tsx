const styles: Record<string, string> = {
  COMPLETED: "border-orange-200 bg-atlas-soft text-atlas",
  INDEXED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ENRICHED: "border-orange-200 bg-atlas-soft text-atlas",
  RUNNING: "border-orange-200 bg-orange-50 text-orange-700",
  PROCESSING: "border-orange-200 bg-orange-50 text-orange-700",
  DRAFT: "border-slate-200 bg-slate-50 text-slate-600",
  PENDING: "border-slate-200 bg-slate-50 text-slate-600",
  NO_MATCH: "border-amber-200 bg-amber-50 text-amber-700",
  FAILED: "border-rose-200 bg-rose-50 text-rose-700",
  PENDING_REVIEW: "border-slate-200 bg-slate-50 text-slate-600",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
  NEEDS_MORE_EVIDENCE: "border-amber-200 bg-amber-50 text-amber-700",
  MANUALLY_CORRECTED: "border-orange-200 bg-atlas-soft text-atlas",
  High: "border-orange-200 bg-atlas text-white",
  Medium: "border-amber-200 bg-amber-50 text-amber-700",
  Low: "border-slate-200 bg-slate-100 text-slate-600",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${styles[value] ?? styles.DRAFT}`}>
      {value.replaceAll("_", " ")}
    </span>
  );
}
