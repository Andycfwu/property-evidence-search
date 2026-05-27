import { PrismaClient, ReviewStatus, SourceType } from "@prisma/client";
import { indexDocument } from "../lib/search/indexer";
import { parseAddress } from "../lib/enrichment/address-parser";
import { runEvidenceJob } from "../lib/enrichment/run-enrichment";

const prisma = new PrismaClient();

const documents = [
  {
    title: "Willow Creek Estates Phase 2 Sales Release (Mock)",
    sourceType: SourceType.BUILDER_BROCHURE,
    sourceUrl: "https://example.test/mock/willow-creek-sales-release",
    text: `MOCK DOCUMENT - FOR DEMONSTRATION ONLY

The community of Willow Creek Estates features new residences along Juniper Hollow Drive in Raleigh, North Carolina 27603. Homes at 1847 Juniper Hollow Drive, Raleigh, NC 27603 are included in the Phase 2 release.

These residences are built by Northline Homes. Sales material identifies Northline Homes as the exclusive builder for Willow Creek Estates Phase 2.`,
  },
  {
    title: "Willow Creek HOA Welcome Circular (Mock)",
    sourceType: SourceType.HOA_NOTICE,
    sourceUrl: "https://example.test/mock/willow-hoa-circular",
    text: `MOCK HOA CIRCULAR

Welcome to the Willow Creek Estates community. Owners on Juniper Hollow Drive, including the model area near 1847 Juniper Hollow Drive, should submit exterior requests to the association.

Community records reference homes by Northline Homes in the current release.`,
  },
  {
    title: "Meadow Ridge Neighborhood Market Sheet (Mock)",
    sourceType: SourceType.LISTING_EXPORT,
    sourceUrl: "https://example.test/mock/meadow-ridge-market",
    text: `MOCK MARKET SHEET

The home at 62 Lantern Way, Durham, NC 27703 is located in the Meadow Ridge neighborhood. Available marketing records note finishes commonly associated with Aster Residential homes in this area, without confirming the original builder.`,
  },
  {
    title: "Cedar Crossing Parcel Notes (Mock)",
    sourceType: SourceType.PUBLIC_RECORD,
    sourceUrl: "https://example.test/mock/cedar-crossing-parcels",
    text: `MOCK PARCEL RESEARCH NOTES

Records for 901 River Birch Court, Cary, NC 27519 reference the Cedar Crossing community in an adjacent planning note. A separate permit summary mentions residential construction activity but does not identify a builder or confirm community membership.`,
  },
];

async function main() {
  await prisma.reviewDecision.deleteMany();
  await prisma.evidenceSource.deleteMany();
  await prisma.evidenceCandidate.deleteMany();
  await prisma.evidenceJobAddress.deleteMany();
  await prisma.evidenceJob.deleteMany();
  await prisma.searchIndexTerm.deleteMany();
  await prisma.documentChunk.deleteMany();
  await prisma.document.deleteMany();

  for (const input of documents) {
    const document = await prisma.document.create({
      data: {
        title: input.title,
        sourceType: input.sourceType,
        sourceUrl: input.sourceUrl,
        rawText: input.text,
        cleanText: "",
        status: "PROCESSING",
      },
    });
    await indexDocument(prisma, document.id, input.text);
  }

  const job = await prisma.evidenceJob.create({
    data: {
      name: "Atlas Triangle Review Sprint - Guided Demo (Mock)",
      addresses: {
        create: [
          "1847 Juniper Hollow Drive, Raleigh, NC 27603",
          "62 Lantern Way, Durham, NC 27703",
          "901 River Birch Court, Cary, NC 27519",
        ].map((rawAddress) => ({ ...parseAddress(rawAddress) })),
      },
    },
  });

  const enriched = await runEvidenceJob(prisma, job.id);
  const addresses = new Map(enriched.addresses.map((address) => [address.rawAddress, address.id]));
  await prisma.reviewDecision.createMany({
    data: [
      {
        jobAddressId: addresses.get("1847 Juniper Hollow Drive, Raleigh, NC 27603")!,
        status: ReviewStatus.APPROVED,
        note: "Two independent mock source artifacts corroborate the community and builder.",
      },
      {
        jobAddressId: addresses.get("62 Lantern Way, Durham, NC 27703")!,
        status: ReviewStatus.MANUALLY_CORRECTED,
        builderOverride: "Aster Residential Homes",
        note: "Reviewer normalized the builder display name while preserving the original medium-confidence evidence.",
      },
      {
        jobAddressId: addresses.get("901 River Birch Court, Cary, NC 27519")!,
        status: ReviewStatus.NEEDS_MORE_EVIDENCE,
        note: "Community reference is weak and no builder is confirmed; obtain an additional public source.",
      },
    ],
  });
  console.log(`Seeded ${documents.length} mock documents and completed demo run ${job.id}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
