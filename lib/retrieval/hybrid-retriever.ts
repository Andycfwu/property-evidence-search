import type { PrismaClient } from "@prisma/client";
import { retrieveLexical } from "./lexical-retriever";
import type { RetrievalFilters, RetrievalResult } from "./retrieval-types";
import { VectorRetrievalUnavailableError } from "./retrieval-types";
import { retrieveVector } from "./vector-retriever";

export type HybridRetrievalResponse = {
  results: RetrievalResult[];
  vectorAvailable: boolean;
  warning: string | null;
};

export async function retrieveHybrid(
  db: PrismaClient,
  query: string,
  limit = 10,
  filters: RetrievalFilters = {},
): Promise<HybridRetrievalResponse> {
  const lexical = await retrieveLexical(db, query, limit * 2, filters);
  let vector: RetrievalResult[] = [];
  let vectorAvailable = true;
  let warning: string | null = null;

  try {
    vector = await retrieveVector(query, limit * 2, filters);
  } catch (error) {
    if (!(error instanceof VectorRetrievalUnavailableError)) throw error;
    vectorAvailable = false;
    warning = error.message;
  }

  const lexicalMax = Math.max(...lexical.map((result) => result.score), 1);
  const semanticMax = Math.max(...vector.map((result) => result.score), 1);
  const merged = new Map<string, RetrievalResult>();

  for (const result of lexical) {
    merged.set(result.chunkId, {
      ...result,
      retrievalMode: "HYBRID",
      lexicalScore: result.score,
      score: result.score / lexicalMax * 0.5,
    });
  }
  for (const result of vector) {
    const prior = merged.get(result.chunkId);
    const semantic = result.score / semanticMax * 0.5;
    merged.set(result.chunkId, prior ? {
      ...prior,
      semanticScore: result.semanticScore,
      score: prior.score + semantic + 0.15,
    } : {
      ...result,
      retrievalMode: "HYBRID",
      score: semantic,
    });
  }

  const results = [...merged.values()]
    .map((result) => ({ ...result, score: Number(result.score.toFixed(4)) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
  return { results, vectorAvailable, warning };
}
