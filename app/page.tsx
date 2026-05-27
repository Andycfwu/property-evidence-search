import Link from "next/link";
import { ArrowRight, BookOpen, FileText, MapPinned, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DemoFlowButton } from "@/components/demo-flow-button";
import { GuideTip } from "@/components/guide-tip";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { PageHeading } from "@/components/page-heading";
import { getPrisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const demoRunName = "Atlas Triangle Review Sprint - Guided Demo (Mock)";

export default async function DashboardPage() {
  const prisma = getPrisma();
  const [documents, chunks, reviewReady, jobs, recentJobs, demoRun] = await Promise.all([
    prisma.document.count(),
    prisma.documentChunk.count(),
    prisma.evidenceJob.count({ where: { status: "COMPLETED" } }),
    prisma.evidenceJob.count(),
    prisma.evidenceJob.findMany({
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { _count: { select: { addresses: true } } },
    }),
    prisma.evidenceJob.findFirst({
      where: { name: demoRunName, status: "COMPLETED" },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    }),
  ]);

  return (
    <AppShell>
      <PageHeading
        eyebrow="Operator Overview"
        title="Evidence Command Center"
        description="Stage source retrieval, execute community and builder research sprints, and review cited Atlas recommendations."
        action={
          <div className="flex flex-wrap gap-3">
            <DemoFlowButton />
            <Link className="button-primary" href="/jobs/new">New Evidence Run</Link>
          </div>
        }
      />
      <GuideTip title="Start here.">
        Use <span className="font-medium">Try Demo Flow</span> for the four-step walkthrough, or start a new run if your sources are already indexed.
      </GuideTip>
      <section className="panel mb-7 overflow-hidden border-orange-100">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div>
            <p className="atlas-kicker mb-2">Demo Mode</p>
            <h2 className="text-xl font-semibold tracking-tight text-ink">How to use this app in one review sprint</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Open the seeded mock run to see high, medium, and low-confidence findings, an approved decision, a corrected builder override, and an evidence-gap escalation.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {demoRun ? (
                <Link className="button-primary gap-2" href={`/jobs/${demoRun.id}`}>
                  Open Seeded Demo Run <ArrowRight size={15} />
                </Link>
              ) : (
                <Link className="button-primary gap-2" href="/jobs">
                  Open Run History <ArrowRight size={15} />
                </Link>
              )}
              <Link className="button-secondary" href="/search">Verify Evidence</Link>
            </div>
          </div>
          <ol className="space-y-3 text-sm text-slate-600">
            {[
              "Browse mock sources and indexed evidence snippets.",
              "Open the completed demo run and compare model output to review decisions.",
              "Filter low-confidence work, then export the CSV or Markdown review package.",
            ].map((step, index) => (
              <li className="flex gap-3 rounded-xl bg-[#FCFBF8] px-4 py-3" key={step}>
                <span className="font-mono text-xs font-semibold text-atlas">0{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Indexed sources", value: documents, icon: FileText, detail: "Files ready for retrieval" },
          { label: "Snippets indexed", value: chunks, icon: BookOpen, detail: "Searchable evidence blocks" },
          { label: "Evidence runs", value: jobs, icon: MapPinned, detail: "Research sprints staged" },
          { label: "Review-ready", value: reviewReady, icon: ShieldCheck, detail: "Completed decision packages" },
        ].map(({ label, value, icon, detail }) => (
          <MetricCard detail={detail} icon={icon} key={label} label={label} value={value} />
        ))}
      </section>
      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="atlas-kicker mb-2">Run Feed</p>
            <h2 className="font-semibold">Recent evidence sprints</h2>
            <p className="text-sm text-slate-500">Active and completed candidate briefs in the operator queue.</p>
          </div>
          <Link href="/documents/new" className="button-secondary">Stage Source</Link>
        </div>
        {recentJobs.length ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FCFBF8] text-[11px] uppercase tracking-[0.12em] text-slate-400">
              <tr><th className="px-6 py-3">Research run</th><th className="px-6 py-3">Properties</th><th className="px-6 py-3">Last signal</th><th className="px-6 py-3">State</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentJobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4 font-medium"><Link className="hover:text-atlas" href={`/jobs/${job.id}`}>{job.name}</Link></td>
                  <td className="px-6 py-4 text-slate-600">{job._count.addresses}</td>
                  <td className="px-6 py-4 text-slate-600">{formatDate(job.updatedAt)}</td>
                  <td className="px-6 py-4"><StatusBadge value={job.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="p-6"><EmptyState>No runs staged. Start an evidence sprint to generate an Atlas brief.</EmptyState></div>}
      </section>
    </AppShell>
  );
}
