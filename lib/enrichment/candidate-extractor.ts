import type { SourceLayer, SourceTrust } from "@prisma/client";
import type { SearchResult } from "@/lib/search/ranker";
import { confidenceFor, type Confidence } from "./confidence";

export const KNOWN_BUILDERS = [
  "Northline Homes",
  "Aster Residential",
  "Cedar Peak Builders",
  "Blue Oak Homes",
  "Pinnacle Homeworks",
];

export type ExtractedCandidate = {
  type: "COMMUNITY" | "BUILDER";
  value: string;
  confidence: Confidence;
  score: number;
  explanation: string;
  sources: SearchResult[];
  sourceLayer: SourceLayer;
  sourceTrust: SourceTrust;
  priority: number;
};

type WorkingCandidate = {
  type: "COMMUNITY" | "BUILDER";
  value: string;
  strength: number;
  sources: Map<string, SearchResult>;
  sourceStrengths: Map<string, number>;
};

export function extractCandidates(results: SearchResult[]): ExtractedCandidate[] {
  const candidates = new Map<string, WorkingCandidate>();

  for (const result of results) {
    for (const match of extractCommunities(result.text)) {
      addCandidate(candidates, "COMMUNITY", match.value, match.strength, result);
    }
    for (const match of extractBuilders(result.text)) {
      addCandidate(candidates, "BUILDER", match.value, match.strength, result);
    }
  }

  return [...candidates.values()]
    .map((candidate) => {
      const sources = [...candidate.sources.values()].sort((a, b) => b.score - a.score);
      const score = Number(
        (candidate.strength * 5 + sources.length * 4 + sources.reduce((sum, item) => sum + item.score, 0) / 8).toFixed(1),
      );
      const strongMatches = candidate.strength >= 3 ? 1 : 0;
      const priority = candidatePriority(sources);
      const leadingSource = [...sources].sort((a, b) => sourceAuthority(b) - sourceAuthority(a))[0];
      const baseConfidence = confidenceFor(score, sources.length, strongMatches);
      const confidence = priority >= 600
        ? "High"
        : priority >= 500 && baseConfidence === "Low" ? "Medium" : baseConfidence;
      return {
        type: candidate.type,
        value: candidate.value,
        confidence,
        score,
        explanation: `${confidence} confidence based on ${sources.length} indexed source snippet${sources.length === 1 ? "" : "s"} and ${candidate.strength >= 3 ? "a direct identifying phrase" : "supporting keyword context"}. ${priorityExplanation(priority)}`,
        sources: [...new Map([leadingSource, ...sources].filter(Boolean).map((source) => [source!.chunkId, source!])).values()].slice(0, 3),
        sourceLayer: leadingSource?.sourceLayer ?? "BASELINE",
        sourceTrust: leadingSource?.sourceTrust ?? "LOW",
        priority,
      };
    })
    .sort((a, b) => b.priority - a.priority || b.score - a.score);
}

function addCandidate(
  map: Map<string, WorkingCandidate>,
  type: "COMMUNITY" | "BUILDER",
  value: string,
  strength: number,
  result: SearchResult,
) {
  const cleaned = titleCase(value.replace(/\s+/g, " ").trim().replace(/[.,;:]$/, ""));
  if (cleaned.length < 3 || cleaned.length > 65) return;
  const key = `${type}:${cleaned.toLowerCase()}`;
  const existing = map.get(key) ?? {
    type,
    value: cleaned,
    strength: 0,
    sources: new Map(),
    sourceStrengths: new Map(),
  };
  const previousStrength = existing.sourceStrengths.get(result.chunkId) ?? 0;
  existing.strength += Math.max(previousStrength, strength) - previousStrength;
  existing.sourceStrengths.set(result.chunkId, Math.max(previousStrength, strength));
  existing.sources.set(result.chunkId, result);
  map.set(key, existing);
}

function extractCommunities(text: string) {
  const matches: Array<{ value: string; strength: number }> = [];
  const patterns = [
    { regex: /(?:verified|baseline)\s+(?:community|subdivision):\s*([A-Z][A-Za-z&' ]{2,60}?)(?=\n|$)/gi, strength: 3 },
    { regex: /(?:community|subdivision):\s*([A-Z][A-Za-z&' ]{2,60}?)(?=\n|$)/gi, strength: 2 },
    { regex: /(?:community|subdivision)\s+(?:of\s+|named\s+)?([A-Z][A-Za-z&' ]{2,45}?)(?=\s+(?:features|offers|includes|is|located|built|by|homeowners)|[,.]|$)/gi, strength: 3 },
    { regex: /located in (?:the\s+)?([A-Z][A-Za-z&' ]{2,45}?)\s+(?:community|subdivision|neighborhood)/gi, strength: 3 },
    { regex: /(?:\bthe\s+)?\b([A-Z][A-Za-z&']+(?:\s+[A-Z][A-Za-z&']+){0,3}\s+(?:Estates|Ridge|Village|Landing|Reserve|Crossing|Grove|Creek))\s+(?:community|subdivision|neighborhood)/gi, strength: 2 },
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern.regex)) {
      matches.push({ value: match[1], strength: pattern.strength });
    }
  }
  return matches;
}

function extractBuilders(text: string) {
  const matches: Array<{ value: string; strength: number }> = [];
  for (const builder of KNOWN_BUILDERS) {
    if (text.toLowerCase().includes(builder.toLowerCase())) {
      const isDirect = new RegExp(`(?:built by|homes by|builder[:\\s]+)\\s*${escapeRegExp(builder)}`, "i").test(text);
      matches.push({ value: builder, strength: isDirect ? 3 : 1 });
    }
  }

  const genericPattern = /(?:built by|homes by|builder[:\s]+)\s*([A-Z][A-Za-z&' ]{2,40}?(?:Homes|Builders|Residential|Construction))/gi;
  for (const match of text.matchAll(genericPattern)) {
    matches.push({ value: match[1], strength: 3 });
  }
  const labeledPattern = /(?:verified|baseline)\s+builder:\s*([A-Z][A-Za-z&' ]{2,60}?)(?=\n|$)/gi;
  for (const match of text.matchAll(labeledPattern)) {
    matches.push({ value: match[1], strength: 3 });
  }
  return matches;
}

function candidatePriority(sources: SearchResult[]) {
  if (sources.some((source) => source.sourceLayer === "REVIEWED" && source.sourceTrust === "VERIFIED")) return 700;
  if (sources.some((source) => source.sourceLayer === "INTERNAL" && source.sourceTrust === "VERIFIED")) return 600;
  if (sources.some((source) => source.sourceLayer === "INTERNAL" && source.sourceTrust === "HIGH")) return 500;
  if (sources.some(isOfficialSource)) return 400;
  const baselineDocuments = new Set(sources.filter((source) => source.sourceLayer === "BASELINE").map((source) => source.documentId));
  return baselineDocuments.size > 1 ? 300 : baselineDocuments.size === 1 ? 200 : 100;
}

function sourceAuthority(source: SearchResult) {
  if (source.sourceLayer === "REVIEWED" && source.sourceTrust === "VERIFIED") return 700;
  if (source.sourceLayer === "INTERNAL" && source.sourceTrust === "VERIFIED") return 600;
  if (source.sourceLayer === "INTERNAL" && source.sourceTrust === "HIGH") return 500;
  if (isOfficialSource(source)) return 400;
  return source.sourceLayer === "BASELINE" ? 200 : 100;
}

function isOfficialSource(source: SearchResult) {
  return source.sourceType === "BUILDER_BROCHURE"
    || /\b(?:builder|community)\b.*\b(?:official|website|page)\b/i.test(source.sourceName);
}

function priorityExplanation(priority: number) {
  if (priority >= 700) return "A reviewed, verified source controls the final recommendation.";
  if (priority >= 600) return "Verified internal evidence controls the final recommendation.";
  if (priority >= 500) return "High-trust internal evidence outranks baseline evidence.";
  if (priority >= 400) return "An official builder or community source supports this recommendation.";
  if (priority >= 300) return "Multiple baseline sources corroborate this label.";
  if (priority >= 200) return "This is supported by a baseline source and should be reviewed when consequential.";
  return "This is a weak inferred match needing human review.";
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
