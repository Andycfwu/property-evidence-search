import type { Prisma, PrismaClient } from "@prisma/client";
import { getEmbedder } from "@/lib/embeddings/embedder";
import { getVectorStore } from "./chroma-client";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export async function indexDocumentVectors(db: DatabaseClient, documentId: string) {
  const document = await db.document.findUniqueOrThrow({
    where: { id: documentId },
    include: { chunks: { orderBy: { chunkIndex: "asc" } } },
  });
  const location = locationMetadata(document.rawText);
  const vectorStore = getVectorStore();

  if (!(await vectorStore.isAvailable())) {
    const error = "Vector search unavailable: ChromaDB is not running.";
    await markFailed(db, documentId, error);
    return { vectorIndexed: false, indexedChunks: 0, error };
  }

  try {
    await db.document.update({
      where: { id: documentId },
      data: { vectorStatus: "PROCESSING", vectorError: null },
    });
    const embeddings = await getEmbedder().embed(document.chunks.map((chunk) => chunk.text));
    await vectorStore.deleteDocumentVectors(documentId);
    await vectorStore.upsertVectors(document.chunks.map((chunk, index) => ({
      id: chunk.id,
      embedding: embeddings[index],
      text: chunk.text,
      metadata: {
        chunkId: chunk.id,
        documentId,
        title: document.title,
        sourceUrl: document.sourceUrl ?? "",
        sourceType: document.sourceType,
        sourceLayer: document.sourceLayer,
        sourceTrust: document.sourceTrust,
        sourceName: document.sourceName,
        city: location.city,
        state: location.state,
        zip: location.zip,
        importedAt: document.importedAt.toISOString(),
      },
    })));
    await db.document.update({
      where: { id: documentId },
      data: { vectorStatus: "INDEXED", vectorError: null, vectorIndexedAt: new Date() },
    });
    return { vectorIndexed: true, indexedChunks: document.chunks.length, error: null };
  } catch (error) {
    const message = vectorIndexError(error);
    await markFailed(db, documentId, message);
    return { vectorIndexed: false, indexedChunks: 0, error: message };
  }
}

function locationMetadata(text: string) {
  const labeledCity = text.match(/^City:\s*(.+)$/im)?.[1]?.trim() ?? "";
  const labeledState = text.match(/^State:\s*([A-Z]{2})\b/im)?.[1]?.toUpperCase() ?? "";
  const labeledZip = text.match(/^ZIP:\s*(\d{5}(?:-\d{4})?)\b/im)?.[1] ?? "";
  if (labeledCity || labeledState || labeledZip) {
    return { city: labeledCity, state: labeledState, zip: labeledZip };
  }
  const cityStateZip = text.match(/\b([A-Z][A-Za-z.' -]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\b/);
  if (cityStateZip) {
    return { city: cityStateZip[1].trim(), state: cityStateZip[2], zip: cityStateZip[3] };
  }
  const zip = text.match(/\b\d{5}(?:-\d{4})?\b/)?.[0] ?? "";
  return { city: "", state: "", zip };
}

async function markFailed(db: DatabaseClient, documentId: string, error: string) {
  await db.document.update({
    where: { id: documentId },
    data: { vectorStatus: "FAILED", vectorError: error.slice(0, 240), vectorIndexedAt: null },
  });
}

function vectorIndexError(error: unknown) {
  const detail = error instanceof Error ? error.message : "Unknown vector indexing error.";
  return `Vector indexing failed: ${detail}`.slice(0, 240);
}
