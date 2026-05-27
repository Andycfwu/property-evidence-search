import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { getPrisma } from "@/lib/db/prisma";
import { compareRetrievalModes } from "@/lib/retrieval/retrieval-evaluator";

const comparisonSchema = z.object({
  query: z.string().trim().min(2),
  limit: z.number().int().min(1).max(10).default(5),
});

export async function POST(request: Request) {
  try {
    const input = comparisonSchema.parse(await request.json());
    const results = await compareRetrievalModes(getPrisma(), input.query, input.limit);
    return NextResponse.json({ query: input.query, ...results });
  } catch (error) {
    return apiError(error);
  }
}
