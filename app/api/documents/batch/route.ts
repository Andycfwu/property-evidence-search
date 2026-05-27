import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { getPrisma } from "@/lib/db/prisma";
import { buildBatchDocument } from "@/lib/ingestion/batch-document";
import { indexDocument } from "@/lib/search/indexer";
import { indexDocumentVectors } from "@/lib/vector/vector-indexer";

const rowSchema = z.object({
  address: z.string().max(500).optional(),
  street: z.string().max(300).optional(),
  city: z.string().max(120).optional(),
  state: z.string().max(80).optional(),
  zip: z.string().max(30).optional(),
  community: z.string().max(250).optional(),
  subdivision: z.string().max(250).optional(),
  builder: z.string().max(250).optional(),
  source_url: z.string().max(2048).optional(),
  source_type: z.string().max(80).optional(),
  source_layer: z.string().max(40).optional(),
  source_trust: z.string().max(40).optional(),
  source_name: z.string().max(160).optional(),
  effective_date: z.string().max(80).optional(),
  external_id: z.string().max(180).optional(),
  verified_community: z.string().max(250).optional(),
  verified_builder: z.string().max(250).optional(),
  baseline_community: z.string().max(250).optional(),
  baseline_builder: z.string().max(250).optional(),
  description: z.string().max(20000).optional(),
  notes: z.string().max(20000).optional(),
  listing_text: z.string().max(100000).optional(),
});

const batchSchema = z.object({
  defaultSourceLayer: z.enum(["BASELINE", "INTERNAL", "REVIEWED"]).default("BASELINE"),
  defaultSourceTrust: z.enum(["LOW", "MEDIUM", "HIGH", "VERIFIED"]).default("MEDIUM"),
  defaultSourceName: z.string().trim().min(2).max(160).default("CSV Import"),
  rows: z.array(rowSchema).min(1).max(1000),
});

export async function POST(request: Request) {
  try {
    const { rows, defaultSourceLayer, defaultSourceTrust, defaultSourceName } = batchSchema.parse(await request.json());
    const prisma = getPrisma();
    let rowsImported = 0;
    let documentsCreated = 0;
    let skippedRows = 0;
    let vectorIndexed = 0;
    let vectorFailures = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (const [index, row] of rows.entries()) {
      const csvRowNumber = index + 2;
      let documentId: string | undefined;
      try {
        const input = buildBatchDocument(row, csvRowNumber, {
          sourceLayer: defaultSourceLayer,
          sourceTrust: defaultSourceTrust,
          sourceName: defaultSourceName,
        });
        const document = await prisma.document.create({ data: { ...input, cleanText: "" } });
        documentId = document.id;
        documentsCreated += 1;
        await indexDocument(prisma, document.id, input.rawText);
        const vectorIndexing = await indexDocumentVectors(prisma, document.id);
        if (vectorIndexing.vectorIndexed) vectorIndexed += 1;
        else vectorFailures += 1;
        rowsImported += 1;
      } catch (error) {
        if (!documentId) {
          skippedRows += 1;
        } else {
          await prisma.document.update({
            where: { id: documentId },
            data: { status: "FAILED" },
          }).catch(() => undefined);
        }
        errors.push({ row: csvRowNumber, message: error instanceof Error ? error.message : "Could not import row." });
      }
    }

    return NextResponse.json({
      rowsReceived: rows.length,
      rowsImported,
      documentsCreated,
      skippedRows,
      vectorIndexed,
      vectorFailures,
      errors,
    }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
