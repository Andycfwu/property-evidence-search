import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getPrisma } from "@/lib/db/prisma";
import { runEvidenceJob } from "@/lib/enrichment/run-enrichment";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const job = await runEvidenceJob(getPrisma(), id);
    return NextResponse.json(job);
  } catch (error) {
    return apiError(error);
  }
}

