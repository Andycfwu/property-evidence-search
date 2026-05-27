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
      <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <StatusBadge label={`Lexical ${document.status}`} value={document.status} />
        <StatusBadge label={`Vector ${document.vectorStatus}`} value={document.vectorStatus === "INDEXED" ? "INDEXED" : document.vectorStatus === "FAILED" ? "FAILED" : "PENDING"} />
        <StatusBadge value={document.sourceLayer} />
        <StatusBadge value={document.sourceTrust} />
        {document.isOverrideSource && <StatusBadge value="OVERRIDE_APPLIED" />}
        <span>{document.sourceName}</span>
        {document.sourceUrl && <a className="text-atlas hover:underline" target="_blank" rel="noreferrer" href={document.sourceUrl}>Open source URL</a>}
      </div>
      {document.vectorError && (
        <p className="mb-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {document.vectorError} Lexical search remains available for this artifact.
        </p>
      )}
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
