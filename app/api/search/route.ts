import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { getPrisma } from "@/lib/db/prisma";
import { retrieveLexical } from "@/lib/retrieval/lexical-retriever";

const searchSchema = z.object({
  query: z.string().trim().min(2),
  limit: z.number().int().min(1).max(30).default(10),
});

export async function POST(request: Request) {
  try {
    const input = searchSchema.parse(await request.json());
    const results = await retrieveLexical(getPrisma(), input.query, input.limit);
    return NextResponse.json({ query: input.query, count: results.length, results });
  } catch (error) {
    return apiError(error);
  }
}
