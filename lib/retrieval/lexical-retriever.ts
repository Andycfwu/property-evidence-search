import type { PrismaClient } from "@prisma/client";
import { searchIndexedChunks } from "@/lib/search/ranker";
import type { RetrievalFilters, RetrievalResult } from "./retrieval-types";

export async function retrieveLexical(
  db: PrismaClient,
  query: string,
  limit = 10,
  filters: RetrievalFilters = {},
): Promise<RetrievalResult[]> {
  const results = await searchIndexedChunks(db, query, Math.max(limit * 2, limit));
  return results
    .filter((result) => matchesFilters(result, filters))
    .slice(0, limit)
    .map((result) => ({
      chunkId: result.chunkId,
      documentId: result.documentId,
      title: result.title,
      text: result.text,
      snippet: result.snippet,
      sourceUrl: result.sourceUrl,
      score: result.score,
      lexicalScore: result.score,
      retrievalMode: "LEXICAL",
      sourceType: result.sourceType,
      sourceLayer: result.sourceLayer,
      sourceTrust: result.sourceTrust,
      sourceName: result.sourceName,
      matchedTerms: result.matchedTerms,
    }));
}

function matchesFilters(result: { sourceLayer: string; sourceTrust: string; sourceType: string }, filters: RetrievalFilters) {
  return (!filters.sourceLayer || result.sourceLayer === filters.sourceLayer)
    && (!filters.sourceTrust || result.sourceTrust === filters.sourceTrust)
    && (!filters.sourceType || result.sourceType === filters.sourceType);
}
