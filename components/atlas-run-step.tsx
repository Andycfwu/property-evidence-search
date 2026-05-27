import type { LucideIcon } from "lucide-react";
import { CheckCircle2 } from "lucide-react";

export function AtlasRunStep({
  icon: Icon,
  title,
  subtitle,
  progress,
  done,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  progress: number;
  done?: boolean;
}) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-slate-100 bg-white p-4">
      <span className={`mt-0.5 rounded-xl p-2.5 ${done ? "bg-atlas-soft text-atlas" : "bg-slate-100 text-slate-500"}`}>
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ink">{title}</p>
          {done ? <CheckCircle2 className="text-atlas" size={15} /> : <span className="font-mono text-[11px] text-slate-400">{progress}%</span>}
        </div>
        <p className="mb-3 text-xs text-slate-500">{subtitle}</p>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-atlas transition-all" style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }} />
        </div>
      </div>
    </div>
  );
}
