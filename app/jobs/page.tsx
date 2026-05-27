import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { GuideTip } from "@/components/guide-tip";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { getPrisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const runs = await getPrisma().evidenceJob.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { addresses: true } } },
  });

  return (
    <AppShell>
      <PageHeading
        eyebrow="Runs / History"
        title="Research sprint archive"
        description="Open prior evidence runs, rerun candidate extraction, or stage a new address cluster."
        action={<Link className="button-primary" href="/jobs/new">New Evidence Run</Link>}
      />
      <GuideTip title="Run history.">
        Open a completed sprint to inspect its recommendation, confidence scoring, and supporting citations.
      </GuideTip>
      <section className="panel overflow-hidden">
        {runs.length ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FCFBF8] text-[11px] uppercase tracking-[0.12em] text-slate-400">
              <tr><th className="px-6 py-4">Sprint name</th><th className="px-6 py-4">Properties</th><th className="px-6 py-4">Updated</th><th className="px-6 py-4">State</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-atlas-soft/30">
                  <td className="px-6 py-5 font-semibold"><Link className="hover:text-atlas" href={`/jobs/${run.id}`}>{run.name}</Link></td>
                  <td className="px-6 py-5 font-mono text-atlas">{run._count.addresses}</td>
                  <td className="px-6 py-5 text-slate-500">{formatDate(run.updatedAt)}</td>
                  <td className="px-6 py-5"><StatusBadge value={run.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="p-6"><EmptyState>No sprint history yet.</EmptyState></div>}
      </section>
    </AppShell>
  );
}
