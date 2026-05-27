import {
  Archive,
  BookOpenCheck,
  FileCheck2,
  Gauge,
  Search,
  Sparkles,
  Wand2,
} from "lucide-react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AtlasRunStep } from "@/components/atlas-run-step";
import { ExportReviewPackage } from "@/components/export-review-package";
import { GuideTip } from "@/components/guide-tip";
import { LiveBriefCard } from "@/components/live-brief-card";
import { RecommendationCard } from "@/components/recommendation-card";
import { ReviewResultsTable, type ReviewResultRow } from "@/components/review-results-table";
import { RunJobButton } from "@/components/run-job-button";
import { SprintMonitor } from "@/components/sprint-monitor";
import { StatusBadge } from "@/components/status-badge";
import { getPrisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const confidenceOrder = { High: 3, Medium: 2, Low: 1 };

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getPrisma().evidenceJob.findUnique({
    where: { id },
    include: {
      addresses: {
        orderBy: { createdAt: "asc" },
        include: {
          reviewDecision: true,
          candidates: {
            orderBy: { score: "desc" },
            include: { sources: { orderBy: { score: "desc" }, include: { document: true } } },
          },
        },
      },
    },
  });
  if (!job) notFound();

  const candidates = job.addresses.flatMap((address) => address.candidates);
  const sources = candidates.flatMap((candidate) => candidate.sources);
  const uniqueSources = [...new Map(sources.map((source) => [source.chunkId, source])).values()];
  const filesRead = new Set(uniqueSources.map((source) => source.documentId)).size;
  const communityCandidates = candidates.filter((candidate) => candidate.candidateType === "COMMUNITY");
  const builderCandidates = candidates.filter((candidate) => candidate.candidateType === "BUILDER");
  const bestCommunity = [...communityCandidates].sort((a, b) => b.score - a.score)[0];
  const bestBuilder = [...builderCandidates].sort((a, b) => b.score - a.score)[0];
  const recommendationConfidence = [bestCommunity?.confidence, bestBuilder?.confidence]
    .filter(Boolean)
    .sort((a, b) => confidenceOrder[b as keyof typeof confidenceOrder] - confidenceOrder[a as keyof typeof confidenceOrder])[0];
  const complete = job.status === "COMPLETED";
  const hasEvidence = sources.length > 0;
  const steps = [
    { icon: Archive, title: "File retrieval", subtitle: "Collect indexed public source artifacts", progress: filesRead ? 100 : complete ? 100 : 18, done: filesRead > 0 || complete },
    { icon: BookOpenCheck, title: "Source inspection", subtitle: "Read candidate-bearing evidence snippets", progress: hasEvidence ? 100 : 25, done: hasEvidence },
    { icon: Search, title: "Evidence search", subtitle: "Match addresses to source language", progress: hasEvidence ? 100 : job.status === "RUNNING" ? 62 : 20, done: hasEvidence },
    { icon: Wand2, title: "Candidate extraction", subtitle: "Normalize communities and builders", progress: candidates.length ? 100 : 12, done: candidates.length > 0 },
    { icon: Gauge, title: "Confidence scoring", subtitle: "Score strength and corroboration", progress: candidates.length ? 100 : 8, done: candidates.length > 0 },
    { icon: FileCheck2, title: "Brief creation", subtitle: "Package cited operator recommendation", progress: complete ? 100 : 5, done: complete },
  ];
  const reviewRows: ReviewResultRow[] = job.addresses.map((address) => {
    const community = address.candidates.find((candidate) => candidate.candidateType === "COMMUNITY");
    const builder = address.candidates.find((candidate) => candidate.candidateType === "BUILDER");
    const rowCandidates = [community, builder].filter(Boolean);
    const confidence = rowCandidates
      .map((candidate) => candidate!.confidence as keyof typeof confidenceOrder)
      .sort((a, b) => confidenceOrder[b] - confidenceOrder[a])[0];
    const rowSources = [...new Map(
      rowCandidates.flatMap((candidate) => candidate!.sources).map((source) => [source.chunkId, source]),
    ).values()].slice(0, 2);
    return {
      id: address.id,
      rawAddress: address.rawAddress,
      addressStatus: address.status,
      confidence,
      community: community ? { value: community.value, score: community.score } : undefined,
      builder: builder ? { value: builder.value, score: builder.score } : undefined,
      sources: rowSources.map((source) => ({
        id: source.id,
        score: source.score,
        snippet: source.snippet,
        sourceType: source.sourceType,
        sourceUrl: source.sourceUrl,
        title: source.document.title,
      })),
      review: address.reviewDecision ? {
        status: address.reviewDecision.status,
        communityOverride: address.reviewDecision.communityOverride,
        builderOverride: address.reviewDecision.builderOverride,
        note: address.reviewDecision.note,
      } : null,
    };
  });

  return (
    <AppShell wide>
      <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <p className="atlas-kicker mb-3">Community Evidence Sprint</p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">{job.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <StatusBadge value={job.status} />
            <span>{job.addresses.length} properties in review</span>
            <span>Opened {formatDate(job.createdAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-start justify-end gap-3">
          {complete && <ExportReviewPackage jobId={job.id} />}
          <RunJobButton jobId={job.id} rerun={complete} />
        </div>
      </div>
      <div className="mb-6 flex items-center gap-3 rounded-full border border-orange-100 bg-white px-5 py-3 text-sm shadow-sm">
        <Sparkles className="text-atlas" size={16} />
        <span className="text-slate-500">Atlas prompt</span>
        <span className="font-medium text-ink">Find subdivision, builder, and supporting source evidence.</span>
      </div>
      <GuideTip title="Step 4 of 4: review the brief.">
        Compare community and builder candidates against highlighted citations, then use confidence to prioritize human review.
      </GuideTip>
      <div className="mb-8 grid gap-6 xl:grid-cols-[minmax(480px,1fr)_350px]">
        <section className="space-y-5">
          <div className="panel p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="atlas-kicker mb-2">Atlas Run</p>
                <h2 className="text-lg font-semibold text-ink">Staged research workflow</h2>
              </div>
              <StatusBadge value={complete ? "COMPLETED" : job.status} />
            </div>
            <div className="space-y-3">
              {steps.map((step) => <AtlasRunStep key={step.title} {...step} />)}
            </div>
          </div>
          <RecommendationCard
            builder={bestBuilder?.value}
            community={bestCommunity?.value}
            confidence={recommendationConfidence}
            explanation={bestCommunity?.explanation ?? bestBuilder?.explanation}
          />
        </section>
        <aside className="space-y-6">
          <LiveBriefCard
            addresses={job.addresses.length}
            status={job.status}
            title={job.name}
            updated={formatDate(job.updatedAt)}
          />
          <SprintMonitor
            builders={builderCandidates.length}
            communities={communityCandidates.length}
            complete={complete}
            filesRead={filesRead}
            snippetsFound={uniqueSources.length}
          />
        </aside>
      </div>
      <ReviewResultsTable complete={complete} initialRows={reviewRows} jobId={job.id} />
    </AppShell>
  );
}
