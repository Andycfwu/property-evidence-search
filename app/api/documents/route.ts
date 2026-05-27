import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/db/prisma";
import { fetchPublicHtml, UrlIngestionError } from "@/lib/ingestion/fetch-url";
import { extractReadableHtml } from "@/lib/ingestion/html-extractor";
import { indexDocument } from "@/lib/search/indexer";
import { indexDocumentVectors } from "@/lib/vector/vector-indexer";
import { apiError } from "@/lib/api";

const createDocumentSchema = z.object({
  ingestionMode: z.enum(["TEXT", "URL"]).default("TEXT"),
  title: z.string().trim().max(160).default(""),
  sourceType: z
    .enum(["PASTED_TEXT", "PUBLIC_RECORD", "BUILDER_BROCHURE", "LISTING_EXPORT", "HOA_NOTICE", "OTHER"])
    .optional(),
  sourceLayer: z.enum(["BASELINE", "INTERNAL", "REVIEWED"]).default("BASELINE"),
  sourceTrust: z.enum(["LOW", "MEDIUM", "HIGH", "VERIFIED"]).default("MEDIUM"),
  sourceName: z.string().trim().min(2).max(160).default("Manual Source"),
  isOverrideSource: z.boolean().default(false),
  sourceUrl: z.string().trim().max(2048).default(""),
  rawText: z.string().trim().default(""),
}).superRefine((input, context) => {
  if (input.ingestionMode === "TEXT" && input.title.length < 2) {
    context.addIssue({ code: "custom", path: ["title"], message: "A document title is required." });
  }
  if (input.ingestionMode === "TEXT" && input.rawText.length < 20) {
    context.addIssue({ code: "custom", path: ["rawText"], message: "Paste at least 20 characters of source text." });
  }
  if (input.ingestionMode === "URL" && !input.sourceUrl) {
    context.addIssue({ code: "custom", path: ["sourceUrl"], message: "A public page URL is required." });
  }
  if (input.sourceUrl && !isHttpUrl(input.sourceUrl)) {
    context.addIssue({ code: "custom", path: ["sourceUrl"], message: "Source URL must use http or https." });
  }
});

export async function GET() {
  const documents = await getPrisma().document.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { chunks: true, terms: true } } },
  });
  return NextResponse.json(documents);
}

export async function POST(request: Request) {
  let documentId: string | undefined;
  try {
    const input = createDocumentSchema.parse(await request.json());
    const prisma = getPrisma();
    let rawText = input.rawText;
    let title = input.title;

    if (input.ingestionMode === "URL") {
      const fetched = await fetchPublicHtml(input.sourceUrl);
      const extracted = extractReadableHtml(fetched.html, fetched.finalUrl);
      if (extracted.text.length < 20) {
        throw new UrlIngestionError(
          "INSUFFICIENT_TEXT",
          "The page did not contain enough readable text to index. Paste source text instead.",
        );
      }
      rawText = extracted.text;
      title = title || extracted.title.slice(0, 160);
    }

    const document = await prisma.document.create({
      data: {
        title,
        sourceType: input.sourceType ?? (input.ingestionMode === "URL" ? "OTHER" : "PASTED_TEXT"),
        sourceLayer: input.sourceLayer,
        sourceTrust: input.sourceTrust,
        sourceName: input.sourceName,
        isOverrideSource: input.isOverrideSource,
        sourceUrl: input.sourceUrl || null,
        rawText,
        cleanText: "",
      },
    });
    documentId = document.id;
    const indexing = await indexDocument(prisma, document.id, rawText);
    const vectorIndexing = await indexDocumentVectors(prisma, document.id);
    const saved = await prisma.document.findUniqueOrThrow({ where: { id: document.id } });

    return NextResponse.json({ document: saved, indexing, vectorIndexing, ingestionMode: input.ingestionMode }, { status: 201 });
  } catch (error) {
    if (documentId) {
      await getPrisma().document.update({
        where: { id: documentId },
        data: { status: "FAILED" },
      }).catch(() => undefined);
    }
    if (error instanceof UrlIngestionError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return apiError(error);
  }
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
