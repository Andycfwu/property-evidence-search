import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { indexDocumentVectors } from "../lib/vector/vector-indexer";

config({ path: ".env.local" });
config();

const prisma = new PrismaClient();

async function main() {
  const documents = await prisma.document.findMany({
    where: { status: "INDEXED" },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true },
  });
  let indexed = 0;
  let failed = 0;

  console.log(`Vector backfill: processing ${documents.length} lexical-indexed documents.`);
  for (const document of documents) {
    const result = await indexDocumentVectors(prisma, document.id);
    if (result.vectorIndexed) {
      indexed += result.indexedChunks;
      console.log(`Indexed ${result.indexedChunks} chunk(s): ${document.title}`);
    } else {
      failed += 1;
      console.error(`Skipped ${document.title}: ${result.error}`);
    }
  }

  console.log(`Vector backfill complete: ${indexed} chunk(s) indexed, ${failed} document failure(s).`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("Vector backfill failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
