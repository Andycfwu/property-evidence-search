import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { retrieveVector } from "@/lib/retrieval/vector-retriever";
import { VectorRetrievalUnavailableError } from "@/lib/retrieval/retrieval-types";

const vectorSearchSchema = z.object({
  query: z.string().trim().min(2),
  filters: z.object({
    sourceLayer: z.enum(["BASELINE", "INTERNAL", "REVIEWED"]).optional(),
    sourceTrust: z.enum(["LOW", "MEDIUM", "HIGH", "VERIFIED"]).optional(),
    sourceType: z.enum(["PASTED_TEXT", "PUBLIC_RECORD", "BUILDER_BROCHURE", "LISTING_EXPORT", "HOA_NOTICE", "OTHER"]).optional(),
  }).optional().default({}),
  limit: z.number().int().min(1).max(30).default(10),
});

export async function POST(request: Request) {
  try {
    const input = vectorSearchSchema.parse(await request.json());
    const results = await retrieveVector(input.query, input.limit, input.filters);
    return NextResponse.json({ query: input.query, count: results.length, retrievalMode: "VECTOR", results });
  } catch (error) {
    if (error instanceof VectorRetrievalUnavailableError) {
      return NextResponse.json({ error: error.message, code: "VECTOR_UNAVAILABLE" }, { status: 503 });
    }
    return apiError(error);
  }
}
