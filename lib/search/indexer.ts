import type { Prisma, PrismaClient } from "@prisma/client";
import { cleanText, splitIntoChunks, termFrequencies, tokenize } from "./tokenizer";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export async function indexDocument(db: DatabaseClient, documentId: string, rawText: string) {
  const normalized = cleanText(rawText);
  const chunks = splitIntoChunks(rawText);

  await db.searchIndexTerm.deleteMany({ where: { documentId } });
  await db.documentChunk.deleteMany({ where: { documentId } });
  await db.document.update({
    where: { id: documentId },
    data: { cleanText: normalized, status: "PROCESSING" },
  });

  let indexedTerms = 0;
  for (const [chunkIndex, text] of chunks.entries()) {
    const chunk = await db.documentChunk.create({
      data: {
        documentId,
        chunkIndex,
        text,
        tokenCount: tokenize(text).length,
      },
    });
    const terms = [...termFrequencies(text)].map(([term, frequency]) => ({
      documentId,
      chunkId: chunk.id,
      term,
      frequency,
    }));
    indexedTerms += terms.length;
    if (terms.length) {
      await db.searchIndexTerm.createMany({ data: terms });
    }
  }

  await db.document.update({
    where: { id: documentId },
    data: { status: "INDEXED" },
  });

  return { chunkCount: chunks.length, indexedTerms };
}

