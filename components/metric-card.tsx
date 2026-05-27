import type { LucideIcon } from "lucide-react";

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  detail?: string;
  icon: LucideIcon;
}) {
  return (
    <article className="panel p-5">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
        <span className="rounded-xl bg-atlas-soft p-2 text-atlas"><Icon size={16} /></span>
      </div>
      <p className="font-mono text-4xl font-semibold tracking-tight text-atlas">{value}</p>
      {detail && <p className="mt-2 text-xs text-slate-500">{detail}</p>}
    </article>
  );
}
