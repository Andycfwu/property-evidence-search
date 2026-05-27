type SourceMetadata = {
  title: string;
  sourceLayer: string;
  sourceTrust: string;
  sourceType: string;
  sourceName: string;
  isOverrideSource: boolean;
};

export type RecommendationSource = {
  id: string;
  chunkId: string;
  score: number;
  snippet: string;
  sourceType: string;
  sourceUrl: string | null;
  document: SourceMetadata;
};

export type RecommendationCandidate = {
  candidateType: string;
  value: string;
  confidence: string;
  score: number;
  explanation: string;
  sources: RecommendationSource[];
};

type ReviewDecision = {
  status: string;
  communityOverride: string | null;
  builderOverride: string | null;
  note: string | null;
} | null | undefined;

export type ResolvedRecommendation = {
  baselineCommunity?: RecommendationCandidate;
  baselineBuilder?: RecommendationCandidate;
  generatedCommunity?: RecommendationCandidate;
  generatedBuilder?: RecommendationCandidate;
  finalCommunity?: string;
  finalBuilder?: string;
  confidence: string;
  finalSourceLayer: string;
  finalSourceTrust: string;
  overrideApplied: boolean;
  overrideReason: string | null;
};

const confidenceOrder: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

export function resolveRecommendation(
  candidates: RecommendationCandidate[],
  reviewDecision?: ReviewDecision,
): ResolvedRecommendation {
  const generatedCommunity = bestByAuthority(candidates, "COMMUNITY");
  const generatedBuilder = bestByAuthority(candidates, "BUILDER");
  const baselineCommunity = bestBaseline(candidates, "COMMUNITY");
  const baselineBuilder = bestBaseline(candidates, "BUILDER");
  const humanCorrected = Boolean(reviewDecision?.communityOverride || reviewDecision?.builderOverride);
  const finalCommunity = reviewDecision?.communityOverride || generatedCommunity?.value;
  const finalBuilder = reviewDecision?.builderOverride || generatedBuilder?.value;
  const controllingCandidate = [generatedCommunity, generatedBuilder]
    .filter((candidate): candidate is RecommendationCandidate => Boolean(candidate))
    .sort((left, right) => candidateAuthority(right) - candidateAuthority(left) || right.score - left.score)[0];
  const controllingSource = controllingCandidate ? strongestSource(controllingCandidate) : undefined;
  const differsFromBaseline = Boolean(
    (baselineCommunity && finalCommunity && baselineCommunity.value !== finalCommunity)
    || (baselineBuilder && finalBuilder && baselineBuilder.value !== finalBuilder),
  );
  const overrideApplied = humanCorrected || differsFromBaseline;
  const finalSourceLayer = humanCorrected ? "HUMAN_REVIEW" : controllingSource?.sourceLayer ?? "BASELINE";
  const finalSourceTrust = humanCorrected ? "VERIFIED" : controllingSource?.sourceTrust ?? "LOW";
  const confidence = [generatedCommunity?.confidence, generatedBuilder?.confidence]
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => (confidenceOrder[right] ?? 0) - (confidenceOrder[left] ?? 0))[0] ?? "Low";

  return {
    baselineCommunity,
    baselineBuilder,
    generatedCommunity,
    generatedBuilder,
    finalCommunity,
    finalBuilder,
    confidence,
    finalSourceLayer,
    finalSourceTrust,
    overrideApplied,
    overrideReason: humanCorrected
      ? "Human review correction overrides the generated recommendation."
      : differsFromBaseline
        ? `${sourceLabel(finalSourceLayer)} source overrides the baseline label.`
        : null,
  };
}

function bestByAuthority(candidates: RecommendationCandidate[], type: string) {
  return candidates
    .filter((candidate) => candidate.candidateType === type)
    .sort((left, right) => candidateAuthority(right) - candidateAuthority(left) || right.score - left.score)[0];
}

function bestBaseline(candidates: RecommendationCandidate[], type: string) {
  return candidates
    .filter((candidate) => candidate.candidateType === type && candidate.sources.some((source) => source.document.sourceLayer === "BASELINE"))
    .sort((left, right) => right.score - left.score)[0];
}

function candidateAuthority(candidate: RecommendationCandidate) {
  return Math.max(100, ...candidate.sources.map((source) => sourceAuthority(source.document)));
}

function strongestSource(candidate: RecommendationCandidate) {
  return candidate.sources.map((source) => source.document)
    .sort((left, right) => sourceAuthority(right) - sourceAuthority(left))[0];
}

function sourceAuthority(source: SourceMetadata) {
  if (source.sourceLayer === "REVIEWED" && source.sourceTrust === "VERIFIED") return 700;
  if (source.sourceLayer === "INTERNAL" && source.sourceTrust === "VERIFIED") return 600;
  if (source.sourceLayer === "INTERNAL" && source.sourceTrust === "HIGH") return 500;
  if (
    source.sourceType === "BUILDER_BROCHURE"
    || /\b(?:builder|community)\b.*\b(?:official|website|page)\b/i.test(source.sourceName)
  ) return 400;
  return source.sourceLayer === "BASELINE" ? 200 : 100;
}

function sourceLabel(layer: string) {
  return layer.toLowerCase().replaceAll("_", " ").replace(/(^|\s)\w/g, (match) => match.toUpperCase());
}
