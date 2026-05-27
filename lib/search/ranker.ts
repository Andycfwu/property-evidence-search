import type { PrismaClient, SourceLayer, SourceTrust, SourceType } from "@prisma/client";
import { cleanText, highlightedSnippet, tokenize } from "./tokenizer";

export type SearchResult = {
  chunkId: string;
  documentId: string;
  title: string;
  sourceUrl: string | null;
  sourceType: SourceType;
  sourceLayer: SourceLayer;
  sourceTrust: SourceTrust;
  sourceName: string;
  isOverrideSource: boolean;
  text: string;
  snippet: string;
  score: number;
  matchedTerms: string[];
};

export async function searchIndexedChunks(
  db: PrismaClient,
  query: string,
  limit = 8,
): Promise<SearchResult[]> {
  const terms = [...new Set(tokenize(query))];
  if (!terms.length) return [];

  const rows = await db.searchIndexTerm.findMany({
    where: { term: { in: terms } },
    include: {
      chunk: {
        include: { document: true },
      },
    },
  });
  const scored = new Map<string, SearchResult>();
  const normalizedQuery = cleanText(query);

  for (const row of rows) {
    const result = scored.get(row.chunkId) ?? {
      chunkId: row.chunkId,
      documentId: row.documentId,
      title: row.chunk.document.title,
      sourceUrl: row.chunk.document.sourceUrl,
      sourceType: row.chunk.document.sourceType,
      sourceLayer: row.chunk.document.sourceLayer,
      sourceTrust: row.chunk.document.sourceTrust,
      sourceName: row.chunk.document.sourceName,
      isOverrideSource: row.chunk.document.isOverrideSource,
      text: row.chunk.text,
      snippet: "",
      score: 0,
      matchedTerms: [],
    };
    result.score += 3 + Math.min(row.frequency, 4) * 1.4;
    result.matchedTerms.push(row.term);
    scored.set(row.chunkId, result);
  }

  for (const result of scored.values()) {
    const chunkClean = cleanText(result.text);
    const titleTerms = tokenize(result.title);
    const titleMatches = terms.filter((term) => titleTerms.includes(term)).length;
    const meaningfulPhrase = normalizedQuery.length > 5 && chunkClean.includes(normalizedQuery);
    const coverage = new Set(result.matchedTerms).size / terms.length;

    result.score += titleMatches * 2.5;
    result.score += meaningfulPhrase ? 14 : 0;
    result.score += coverage * 6;
    result.matchedTerms = [...new Set(result.matchedTerms)];
    result.snippet = highlightedSnippet(result.text, result.matchedTerms);
    result.score = Number(result.score.toFixed(1));
  }

  return [...scored.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}
