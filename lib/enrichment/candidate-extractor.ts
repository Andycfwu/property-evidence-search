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
      const confidence = confidenceFor(score, sources.length, strongMatches);
      return {
        type: candidate.type,
        value: candidate.value,
        confidence,
        score,
        explanation: `${confidence} confidence based on ${sources.length} indexed source snippet${sources.length === 1 ? "" : "s"} and ${candidate.strength >= 3 ? "a direct identifying phrase" : "supporting keyword context"}.`,
        sources: sources.slice(0, 3),
      };
    })
    .sort((a, b) => b.score - a.score);
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
    { regex: /(?:community|subdivision)\s+(?:of\s+|named\s+)?([A-Z][A-Za-z&' ]{2,45}?)(?=\s+(?:features|offers|includes|is|located|built|by|homeowners)|[,.]|$)/g, strength: 3 },
    { regex: /located in (?:the\s+)?([A-Z][A-Za-z&' ]{2,45}?)\s+(?:community|subdivision|neighborhood)/g, strength: 3 },
    { regex: /(?:\b[Tt]he\s+)?\b([A-Z][A-Za-z&']+(?:\s+[A-Z][A-Za-z&']+){0,3}\s+(?:Estates|Ridge|Village|Landing|Reserve|Crossing|Grove|Creek))\s+(?:community|subdivision|neighborhood)/g, strength: 2 },
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

  const genericPattern = /(?:built by|homes by|builder[:\s]+)\s*([A-Z][A-Za-z&' ]{2,40}?(?:Homes|Builders|Residential|Construction))/g;
  for (const match of text.matchAll(genericPattern)) {
    matches.push({ value: match[1], strength: 3 });
  }
  return matches;
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
