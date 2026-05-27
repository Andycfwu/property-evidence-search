import { ClipboardList } from "lucide-react";
import { StatusBadge } from "./status-badge";

export function LiveBriefCard({
  title,
  status,
  addresses,
  updated,
}: {
  title: string;
  status: string;
  addresses: number;
  updated: string;
}) {
  return (
    <section className="panel p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className="rounded-xl bg-atlas-soft p-2 text-atlas"><ClipboardList size={17} /></span>
        <div>
          <p className="atlas-kicker">Live Brief</p>
          <p className="text-sm font-semibold text-ink">Operator snapshot</p>
        </div>
      </div>
      <p className="mb-3 text-sm font-semibold text-ink">{title}</p>
      <StatusBadge value={status} />
      <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs">
        <div><dt className="text-slate-400">Addresses</dt><dd className="mt-1 font-mono text-lg font-semibold text-atlas">{addresses}</dd></div>
        <div><dt className="text-slate-400">Last touch</dt><dd className="mt-2 font-medium text-slate-600">{updated}</dd></div>
      </dl>
    </section>
  );
}
