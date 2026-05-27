import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { GuideTip } from "@/components/guide-tip";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { PageHeading } from "@/components/page-heading";
import { getPrisma } from "@/lib/db/prisma";
import { formatDate, formatSourceType } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const documents = await getPrisma().document.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { chunks: true, terms: true } } },
  });

  return (
    <AppShell>
      <PageHeading
        eyebrow="File Browser"
        title="Source Library"
        description="Browse staged source artifacts, searchable chunks, and provenance for every evidence sprint."
        action={<Link className="button-primary" href="/documents/new">Add Source File</Link>}
      />
      <GuideTip title="Source coverage.">
        Open an artifact to inspect its indexed snippets, or add another source to improve candidate corroboration.
      </GuideTip>
      <section className="panel overflow-hidden">
        {documents.length ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FCFBF8] text-[11px] uppercase tracking-[0.12em] text-slate-400">
              <tr><th className="px-6 py-4">Source artifact</th><th className="px-6 py-4">Classification</th><th className="px-6 py-4">Coverage</th><th className="px-6 py-4">State</th><th className="px-6 py-4">Pulled</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((document) => (
                <tr key={document.id}>
                  <td className="px-6 py-4 font-medium"><Link className="hover:text-atlas" href={`/documents/${document.id}`}>{document.title}</Link></td>
                  <td className="px-6 py-4 text-slate-600">{formatSourceType(document.sourceType)}</td>
                  <td className="px-6 py-4 text-slate-600">{document._count.chunks} chunks / {document._count.terms} terms</td>
                  <td className="px-6 py-4"><StatusBadge value={document.status} /></td>
                  <td className="px-6 py-4 text-slate-600">{formatDate(document.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="p-6"><EmptyState>No sources staged yet. Add public evidence to begin retrieval.</EmptyState></div>}
      </section>
    </AppShell>
  );
}
