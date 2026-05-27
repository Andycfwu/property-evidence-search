import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { GuideTip } from "@/components/guide-tip";
import { StatusBadge } from "@/components/status-badge";
import { PageHeading } from "@/components/page-heading";
import { getPrisma } from "@/lib/db/prisma";
import { formatSourceType } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = await getPrisma().document.findUnique({
    where: { id },
    include: { chunks: { orderBy: { chunkIndex: "asc" } }, _count: { select: { terms: true } } },
  });
  if (!document) notFound();

  return (
    <AppShell>
      <PageHeading
        eyebrow="Source Artifact"
        title={document.title}
        description={`${formatSourceType(document.sourceType)} with ${document.chunks.length} evidence snippets and ${document._count.terms} indexed terms ready for a research sprint.`}
        action={<Link className="button-secondary" href="/search">Search Evidence</Link>}
      />
      <div className="mb-5 flex items-center gap-4 text-sm text-slate-600">
        <StatusBadge value={document.status} />
        {document.sourceUrl && <a className="text-atlas hover:underline" target="_blank" rel="noreferrer" href={document.sourceUrl}>Open source URL</a>}
      </div>
      <GuideTip title="Indexed source review.">
        These snippets are the exact searchable evidence blocks Atlas can cite in a generated decision package.
      </GuideTip>
      <section className="space-y-4">
        {document.chunks.map((chunk) => (
          <article className="panel p-5" key={chunk.id}>
            <p className="atlas-kicker mb-3">Evidence snippet {chunk.chunkIndex + 1} / {chunk.tokenCount} terms</p>
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{chunk.text}</p>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
