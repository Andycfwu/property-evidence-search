import { resolveRecommendation, type RecommendationCandidate } from "@/lib/enrichment/recommendation-resolver";

type ReviewSource = {
  id: string;
  chunkId: string;
  score: number;
  snippet: string;
  sourceType: string;
  sourceUrl: string | null;
  document: {
    title: string;
    sourceLayer: string;
    sourceTrust: string;
    sourceType: string;
    sourceName: string;
    isOverrideSource: boolean;
  };
};

type ReviewCandidate = RecommendationCandidate & {
  sources: ReviewSource[];
};

export type ReviewPackageJob = {
  name: string;
  addresses: Array<{
    rawAddress: string;
    candidates: ReviewCandidate[];
    reviewDecision?: {
      status: string;
      communityOverride: string | null;
      builderOverride: string | null;
      note: string | null;
    } | null;
  }>;
};

type Finding = {
  address: string;
  recommendation: ReturnType<typeof resolveRecommendation>;
  sources: ReviewSource[];
  explanation: string;
  review: ReviewPackageJob["addresses"][number]["reviewDecision"];
};

function findingsFor(job: ReviewPackageJob): Finding[] {
  return job.addresses.map((address) => {
    const recommendation = resolveRecommendation(address.candidates, address.reviewDecision);
    const selected = [
      recommendation.generatedCommunity,
      recommendation.generatedBuilder,
      recommendation.baselineCommunity,
      recommendation.baselineBuilder,
    ]
      .filter((candidate): candidate is ReviewCandidate => Boolean(candidate));
    const sources = [...new Map(selected.flatMap((candidate) => candidate.sources).map((source) => [source.chunkId, source])).values()];
    const explanation = [...new Set(selected.map((candidate) => candidate.explanation))].join(" ");
    return { address: address.rawAddress, recommendation, sources, explanation, review: address.reviewDecision };
  });
}

function escapeCsv(value: string) {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}

function markdownValue(value?: string) {
  return value || "Not identified";
}

function plainSnippet(snippet: string) {
  return snippet.replaceAll("<mark>", "").replaceAll("</mark>", "");
}

function label(value?: string) {
  return value ? value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase()) : "Pending Review";
}

function citation(source: ReviewSource, index: number) {
  const location = source.sourceUrl ? ` ([source](${source.sourceUrl}))` : "";
  const provenance = `${label(source.document.sourceLayer)} / ${label(source.document.sourceTrust)}`;
  return `${index + 1}. **${source.document.title}** - ${provenance}${location}\n   > ${plainSnippet(source.snippet).replaceAll("\n", "\n   > ")}`;
}

export function createReviewPackageCsv(job: ReviewPackageJob) {
  const headers = [
    "Address",
    "Baseline Community",
    "Baseline Builder",
    "Final Community",
    "Final Builder",
    "Final Source Layer",
    "Final Source Trust",
    "Override Applied",
    "Override Reason",
    "Reviewer Status",
    "Reviewer Notes",
    "Evidence Snippets",
    "Source URLs",
  ];
  const rows = findingsFor(job).map(({ address, recommendation, review, sources }) => [
    address,
    recommendation.baselineCommunity?.value ?? "",
    recommendation.baselineBuilder?.value ?? "",
    recommendation.finalCommunity ?? "",
    recommendation.finalBuilder ?? "",
    label(recommendation.finalSourceLayer),
    label(recommendation.finalSourceTrust),
    recommendation.overrideApplied ? "Yes" : "No",
    recommendation.overrideReason ?? "",
    label(review?.status),
    review?.note ?? "",
    sources.map((source) => plainSnippet(source.snippet)).join("\n---\n"),
    [...new Set(sources.map((source) => source.sourceUrl).filter(Boolean))].join("\n"),
  ]);
  return [headers, ...rows].map((row) => row.map((cell) => escapeCsv(cell)).join(",")).join("\n");
}

export function createReviewPackageMarkdown(job: ReviewPackageJob) {
  const findings = findingsFor(job);
  const overrideCount = findings.filter(({ recommendation }) => recommendation.overrideApplied).length;
  const reviewItems = findings.filter(({ recommendation, review }) => (
    recommendation.confidence === "Low"
    || review?.status === "NEEDS_MORE_EVIDENCE"
    || !recommendation.finalCommunity
    || !recommendation.finalBuilder
  ));
  const addressSections = findings.map(({ address, recommendation, review, sources, explanation }) => [
    `### ${address}`,
    `- Baseline community: **${markdownValue(recommendation.baselineCommunity?.value)}**`,
    `- Baseline builder: **${markdownValue(recommendation.baselineBuilder?.value)}**`,
    `- Final community: **${markdownValue(recommendation.finalCommunity)}**`,
    `- Final builder: **${markdownValue(recommendation.finalBuilder)}**`,
    `- Final source: **${label(recommendation.finalSourceLayer)} / ${label(recommendation.finalSourceTrust)}**`,
    `- Confidence: **${recommendation.confidence}**`,
    `- Override applied: **${recommendation.overrideApplied ? "Yes" : "No"}**${recommendation.overrideReason ? ` - ${recommendation.overrideReason}` : ""}`,
    `- Reviewer status: **${label(review?.status)}**`,
    ...(review?.note ? [`- Reviewer note: ${review.note}`] : []),
    `- Explanation: ${explanation || "No extracted candidate explanation is available."}`,
    "",
    "#### Evidence Citations",
    sources.length ? sources.map((source, index) => citation(source, index)).join("\n\n") : "No supporting evidence citations were identified.",
  ].join("\n"));

  return [
    `# Review Brief: ${job.name}`,
    "",
    "## Summary Recommendation",
    `${findings.length} address finding(s) evaluated; ${overrideCount} final recommendation override(s) applied using internal review or higher-priority evidence.`,
    "",
    "Priority order: human review, reviewed verified sources, internal verified/high-trust sources, official builder/community evidence, then corroborated baseline evidence.",
    "",
    "## Per-Address Findings",
    addressSections.join("\n\n"),
    "",
    "## Low-Confidence Items Needing Human Review",
    reviewItems.length
      ? reviewItems.map(({ address }) => `- **${address}**: collect or confirm additional permitted evidence before downstream use.`).join("\n")
      : "- No low-confidence findings were identified in this run.",
    "",
  ].join("\n");
}

export function reviewPackageFilename(name: string, extension: "csv" | "md") {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "evidence-run";
  return `${base}-review-package.${extension}`;
}
