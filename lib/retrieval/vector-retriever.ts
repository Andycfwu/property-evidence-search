import { getEmbedder } from "@/lib/embeddings/embedder";
import { escapeHtml, highlightedSnippet, tokenize } from "@/lib/search/tokenizer";
import { getVectorStore } from "@/lib/vector/chroma-client";
import {
  VectorRetrievalUnavailableError,
  type RetrievalFilters,
  type RetrievalResult,
} from "./retrieval-types";

export async function retrieveVector(
  query: string,
  limit = 10,
  filters: RetrievalFilters = {},
): Promise<RetrievalResult[]> {
  const vectorStore = getVectorStore();
  if (!(await vectorStore.isAvailable())) {
    throw new VectorRetrievalUnavailableError();
  }

  try {
    const embedding = await getEmbedder().embedQuery(query);
    const matches = await vectorStore.queryVectors(embedding, limit, filters);
    const terms = tokenize(query);
    return matches.map((match) => {
      const semanticScore = Number((1 / (1 + Math.max(0, match.distance))).toFixed(4));
      return {
        chunkId: match.metadata.chunkId,
        documentId: match.metadata.documentId,
        title: match.metadata.title,
        text: match.text,
        snippet: terms.length ? highlightedSnippet(match.text, terms) : escapeHtml(match.text.slice(0, 270)),
        sourceUrl: match.metadata.sourceUrl || null,
        score: semanticScore,
        semanticScore,
        retrievalMode: "VECTOR",
        sourceType: match.metadata.sourceType as RetrievalResult["sourceType"],
        sourceLayer: match.metadata.sourceLayer as RetrievalResult["sourceLayer"],
        sourceTrust: match.metadata.sourceTrust as RetrievalResult["sourceTrust"],
        sourceName: match.metadata.sourceName,
      };
    });
  } catch (error) {
    if (error instanceof VectorRetrievalUnavailableError) throw error;
    throw new VectorRetrievalUnavailableError(
      `Vector search unavailable: ${error instanceof Error ? error.message : "retrieval failed."}`,
    );
  }
}
