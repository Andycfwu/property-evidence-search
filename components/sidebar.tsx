import Link from "next/link";
import { Archive, FileText, History, Plus, Search, Sparkles } from "lucide-react";
import { StatusBadge } from "./status-badge";

export type SidebarRun = {
  id: string;
  name: string;
  status: string;
};

const navigation = [
  { href: "/jobs/new", label: "New Evidence Run", icon: Plus },
  { href: "/search", label: "Search Evidence", icon: Search },
  { href: "/documents", label: "File Browser / Documents", icon: FileText },
  { href: "/jobs", label: "Runs / History", icon: History },
];

export function Sidebar({ recentRuns }: { recentRuns: SidebarRun[] }) {
  return (
    <aside className="flex min-h-screen flex-col border-r border-slate-200 bg-white/90 p-5 lg:sticky lg:top-0 lg:h-screen">
      <Link className="mb-8 block" href="/">
        <p className="text-xl font-semibold tracking-tight text-ink">RealTorch<span className="text-atlas">.</span></p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.19em] text-slate-400">Atlas Evidence Console</p>
      </Link>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-3.5 text-slate-400" size={15} />
        <input className="input pl-9 text-xs" aria-label="Search workspace" placeholder="Search workspace" />
      </div>
      <nav className="space-y-1">
        {navigation.map(({ href, label, icon: Icon }) => (
          <Link className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-atlas-soft hover:text-atlas" href={href} key={href}>
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-8 border-t border-slate-100 pt-5">
        <p className="atlas-kicker mb-4">Recent Runs</p>
        <div className="space-y-3">
          {recentRuns.length ? recentRuns.map((run) => (
            <Link className="block rounded-xl border border-transparent p-3 transition hover:border-orange-100 hover:bg-atlas-soft/60" href={`/jobs/${run.id}`} key={run.id}>
              <p className="mb-2 truncate text-xs font-semibold text-ink">{run.name}</p>
              <StatusBadge value={run.status} />
            </Link>
          )) : <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">No research sprints yet.</p>}
        </div>
      </div>
      <div className="mt-auto border-t border-slate-100 pt-5">
        <p className="atlas-kicker mb-3">Research Tools</p>
        <Link className="mb-5 flex items-center gap-2 rounded-xl border border-orange-100 bg-atlas-soft px-3 py-3 text-xs font-medium text-atlas" href="/documents/new">
          <Archive size={14} /> Add source artifact
        </Link>
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-3">
          <span className="rounded-full bg-atlas p-2 text-white"><Sparkles size={13} /></span>
          <div>
            <p className="text-xs font-semibold text-ink">Builder Research Team</p>
            <p className="text-[11px] text-slate-400">Operator workspace</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
