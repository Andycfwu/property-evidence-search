import type { PrismaClient } from "@prisma/client";
import { retrieveHybrid } from "./hybrid-retriever";
import { retrieveLexical } from "./lexical-retriever";
import type { RetrievalFilters, RetrievalResult } from "./retrieval-types";
import { VectorRetrievalUnavailableError } from "./retrieval-types";
import { retrieveVector } from "./vector-retriever";

export async function compareRetrievalModes(
  db: PrismaClient,
  query: string,
  limit = 5,
  filters: RetrievalFilters = {},
) {
  const lexical = await retrieveLexical(db, query, limit, filters);
  let vector: RetrievalResult[] = [];
  let vectorWarning: string | null = null;
  try {
    vector = await retrieveVector(query, limit, filters);
  } catch (error) {
    if (!(error instanceof VectorRetrievalUnavailableError)) throw error;
    vectorWarning = error.message;
  }
  const hybrid = await retrieveHybrid(db, query, limit, filters);
  return { lexical, vector, hybrid: hybrid.results, vectorWarning: vectorWarning ?? hybrid.warning };
}
