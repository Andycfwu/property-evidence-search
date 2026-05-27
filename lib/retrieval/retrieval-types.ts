import type { SourceLayer, SourceTrust, SourceType } from "@prisma/client";

export type RetrievalMode = "LEXICAL" | "VECTOR" | "HYBRID";

export type RetrievalFilters = {
  sourceLayer?: SourceLayer;
  sourceTrust?: SourceTrust;
  sourceType?: SourceType;
};

export type RetrievalResult = {
  chunkId: string;
  documentId: string;
  title: string;
  text?: string;
  snippet: string;
  sourceUrl: string | null;
  score: number;
  retrievalMode: RetrievalMode;
  sourceType: SourceType;
  sourceLayer: SourceLayer;
  sourceTrust: SourceTrust;
  sourceName?: string;
  matchedTerms?: string[];
  semanticScore?: number;
  lexicalScore?: number;
};

export class VectorRetrievalUnavailableError extends Error {
  constructor(message = "Vector search unavailable. Start ChromaDB and index vectors to use semantic retrieval.") {
    super(message);
    this.name = "VectorRetrievalUnavailableError";
  }
}
