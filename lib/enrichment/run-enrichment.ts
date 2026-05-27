import type { PrismaClient } from "@prisma/client";
import { buildAddressQuery } from "./address-parser";
import { extractCandidates } from "./candidate-extractor";
import { searchIndexedChunks } from "@/lib/search/ranker";
import { cleanText, tokenize } from "@/lib/search/tokenizer";

export async function runEvidenceJob(db: PrismaClient, jobId: string) {
  const job = await db.evidenceJob.findUniqueOrThrow({
    where: { id: jobId },
    include: { addresses: true },
  });
  await db.evidenceJob.update({ where: { id: jobId }, data: { status: "RUNNING" } });

  try {
    for (const address of job.addresses) {
      const query = buildAddressQuery({
        rawAddress: address.rawAddress,
        street: address.street,
        city: address.city,
        state: address.state,
        zip: address.zip,
      });
      const searchResults = (await searchIndexedChunks(db, query, 10))
        .filter((result) => supportsAddress(result.text, address));
      const extracted = extractCandidates(searchResults);
      const bestByType = ["COMMUNITY", "BUILDER"].flatMap((type) => {
        const result = extracted.find((candidate) => candidate.type === type);
        return result ? [result] : [];
      });

      await db.evidenceCandidate.deleteMany({ where: { jobAddressId: address.id } });
      for (const candidate of bestByType) {
        await db.evidenceCandidate.create({
          data: {
            jobAddressId: address.id,
            candidateType: candidate.type,
            value: candidate.value,
            confidence: candidate.confidence,
            score: candidate.score,
            explanation: candidate.explanation,
            sources: {
              create: candidate.sources.map((source) => ({
                documentId: source.documentId,
                chunkId: source.chunkId,
                sourceUrl: source.sourceUrl,
                snippet: source.snippet,
                sourceType: source.sourceType,
                score: source.score,
              })),
            },
          },
        });
      }
      await db.evidenceJobAddress.update({
        where: { id: address.id },
        data: { status: bestByType.length ? "ENRICHED" : "NO_MATCH" },
      });
    }

    return db.evidenceJob.update({
      where: { id: jobId },
      data: { status: "COMPLETED" },
      include: {
        addresses: {
          include: { candidates: { include: { sources: true } } },
        },
      },
    });
  } catch (error) {
    await db.evidenceJob.update({ where: { id: jobId }, data: { status: "FAILED" } });
    throw error;
  }
}

function supportsAddress(
  text: string,
  address: {
    street: string | null;
    city: string | null;
    zip: string | null;
  },
) {
  const normalizedText = cleanText(text);
  const zip = address.zip?.toLowerCase();
  const streetTerms = tokenize(address.street ?? "").filter((term) => !STREET_SUFFIXES.has(term));
  const cityTerms = tokenize(address.city ?? "");

  if (zip && normalizedText.includes(zip)) return true;
  if (streetTerms.some((term) => normalizedText.includes(term))) return true;
  return cityTerms.length > 0 && cityTerms.every((term) => normalizedText.includes(term));
}

const STREET_SUFFIXES = new Set([
  "avenue",
  "ave",
  "boulevard",
  "blvd",
  "court",
  "ct",
  "drive",
  "dr",
  "lane",
  "ln",
  "road",
  "rd",
  "street",
  "st",
  "way",
]);
