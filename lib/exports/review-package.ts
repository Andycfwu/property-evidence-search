type ReviewSource = {
  chunkId: string;
  snippet: string;
  sourceUrl: string | null;
  document: { title: string };
};

type ReviewCandidate = {
  candidateType: string;
  value: string;
  confidence: string;
  score: number;
  explanation: string;
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
  community?: ReviewCandidate;
  builder?: ReviewCandidate;
  confidence: string;
  explanation: string;
  sources: ReviewSource[];
  review?: ReviewPackageJob["addresses"][number]["reviewDecision"];
};

const confidenceOrder: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

function bestCandidate(candidates: ReviewCandidate[], type: string) {
  return candidates
    .filter((candidate) => candidate.candidateType === type)
    .sort((a, b) => b.score - a.score)[0];
}

function uniqueSources(candidates: Array<ReviewCandidate | undefined>) {
  const sources = candidates.flatMap((candidate) => candidate?.sources ?? []);
  return [...new Map(sources.map((source) => [source.chunkId, source])).values()];
}

function confidenceFor(candidates: Array<ReviewCandidate | undefined>) {
  return candidates
    .map((candidate) => candidate?.confidence)
    .filter((confidence): confidence is string => Boolean(confidence))
    .sort((a, b) => (confidenceOrder[b] ?? 0) - (confidenceOrder[a] ?? 0))[0] ?? "Needs review";
}

function findingsFor(job: ReviewPackageJob): Finding[] {
  return job.addresses.map((address) => {
    const community = bestCandidate(address.candidates, "COMMUNITY");
    const builder = bestCandidate(address.candidates, "BUILDER");
    const candidates = [community, builder];
    const explanations = [...new Set(candidates.map((candidate) => candidate?.explanation).filter(Boolean))];
    return {
      address: address.rawAddress,
      community,
      builder,
      confidence: confidenceFor(candidates),
      explanation: explanations.join(" "),
      sources: uniqueSources(candidates),
      review: address.reviewDecision,
    };
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

function reviewStatusLabel(status?: string) {
  return status ? status.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase()) : "Pending Review";
}

function effectiveCommunity(finding: Finding) {
  return finding.review?.communityOverride || finding.community?.value;
}

function effectiveBuilder(finding: Finding) {
  return finding.review?.builderOverride || finding.builder?.value;
}

function reviewExplanation(finding: Finding) {
  const decision = finding.review
    ? `Reviewer decision: ${reviewStatusLabel(finding.review.status)}.`
    : "";
  const note = finding.review?.note ? ` Reviewer note: ${finding.review.note}` : "";
  return [finding.explanation, decision + note].filter(Boolean).join(" ");
}

function citation(source: ReviewSource, index: number) {
  const location = source.sourceUrl ? ` ([source](${source.sourceUrl}))` : "";
  return `${index + 1}. **${source.document.title}**${location}\n   > ${plainSnippet(source.snippet).replaceAll("\n", "\n   > ")}`;
}

export function createReviewPackageCsv(job: ReviewPackageJob) {
  const headers = [
    "Address",
    "Likely Community",
    "Likely Builder",
    "Confidence",
    "Explanation",
    "Evidence Snippets",
    "Source URLs",
  ];
  const rows = findingsFor(job).map((finding) => [
    finding.address,
    effectiveCommunity(finding) ?? "",
    effectiveBuilder(finding) ?? "",
    finding.confidence,
    reviewExplanation(finding),
    finding.sources.map((source) => plainSnippet(source.snippet)).join("\n---\n"),
    [...new Set(finding.sources.map((source) => source.sourceUrl).filter(Boolean))].join("\n"),
  ]);

  return [headers, ...rows].map((row) => row.map((cell) => escapeCsv(cell)).join(",")).join("\n");
}

export function createReviewPackageMarkdown(job: ReviewPackageJob) {
  const findings = findingsFor(job);
  const allCandidates = job.addresses.flatMap((address) => address.candidates);
  const community = bestCandidate(allCandidates, "COMMUNITY");
  const builder = bestCandidate(allCandidates, "BUILDER");
  const overallConfidence = confidenceFor([community, builder]);
  const reviewItems = findings.flatMap((finding) => {
    const concerns = [
      !finding.community ? "community not identified" : finding.community.confidence === "Low" ? "community confidence is low" : null,
      !finding.builder ? "builder not identified" : finding.builder.confidence === "Low" ? "builder confidence is low" : null,
    ].filter((concern): concern is string => Boolean(concern));
    return concerns.length ? [{ finding, concerns }] : [];
  });

  const summary = [
    `Likely community: **${markdownValue(community?.value)}**`,
    `Likely builder: **${markdownValue(builder?.value)}**`,
    `Overall evidence confidence: **${overallConfidence}**`,
  ].join("  \n");

  const addressSections = findings.map((finding) => {
    const sources = finding.sources.length
      ? finding.sources.map((source, index) => citation(source, index)).join("\n\n")
      : "No supporting evidence citations were identified.";
    return [
      `### ${finding.address}`,
      `- Likely community: **${markdownValue(effectiveCommunity(finding))}**`,
      `- Likely builder: **${markdownValue(effectiveBuilder(finding))}**`,
      `- Confidence: **${finding.confidence}**`,
      `- Explanation: ${finding.explanation || "No extracted candidate explanation is available."}`,
      `- Review status: **${reviewStatusLabel(finding.review?.status)}**`,
      ...(finding.review?.note ? [`- Reviewer note: ${finding.review.note}`] : []),
      ...(finding.review?.communityOverride || finding.review?.builderOverride
        ? [`- Original model finding: ${markdownValue(finding.community?.value)} / ${markdownValue(finding.builder?.value)}`]
        : []),
      "",
      "#### Evidence Citations",
      sources,
    ].join("\n");
  });

  const reviewSection = reviewItems.length
    ? reviewItems
        .map(({ finding, concerns }) => `- **${finding.address}**: ${concerns.join("; ")}; verify against additional public source evidence.`)
        .join("\n")
    : "- No low-confidence findings were identified in this run.";

  return [
    `# Review Brief: ${job.name}`,
    "",
    "## Summary Recommendation",
    summary,
    "",
    "## Per-Address Findings",
    addressSections.join("\n\n"),
    "",
    "## Low-Confidence Items Needing Human Review",
    reviewSection,
    "",
  ].join("\n");
}

export function reviewPackageFilename(name: string, extension: "csv" | "md") {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "evidence-run";
  return `${base}-review-package.${extension}`;
}
