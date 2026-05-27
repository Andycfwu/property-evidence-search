import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { getPrisma } from "@/lib/db/prisma";
import { retrieveHybrid } from "@/lib/retrieval/hybrid-retriever";

const hybridSearchSchema = z.object({
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
    const input = hybridSearchSchema.parse(await request.json());
    const response = await retrieveHybrid(getPrisma(), input.query, input.limit, input.filters);
    return NextResponse.json({
      query: input.query,
      count: response.results.length,
      retrievalMode: "HYBRID",
      ...response,
    });
  } catch (error) {
    return apiError(error);
  }
}
