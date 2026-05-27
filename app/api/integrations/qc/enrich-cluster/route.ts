import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { getPrisma } from "@/lib/db/prisma";
import { parseAddress } from "@/lib/enrichment/address-parser";
import { runEvidenceJob } from "@/lib/enrichment/run-enrichment";

const clusterSchema = z.object({
  clusterId: z.string().trim().min(1).optional(),
  name: z.string().trim().min(2).optional(),
  addresses: z.array(z.string().trim().min(5)).min(1).max(500),
});

export async function POST(request: Request) {
  try {
    const input = clusterSchema.parse(await request.json());
    const prisma = getPrisma();
    const job = await prisma.evidenceJob.create({
      data: {
        name: input.name ?? `QC cluster ${input.clusterId ?? new Date().toISOString()}`,
        addresses: { create: input.addresses.map((address) => parseAddress(address)) },
      },
    });
    const enriched = await runEvidenceJob(prisma, job.id);

    return NextResponse.json({
      clusterId: input.clusterId ?? null,
      evidenceJobId: enriched.id,
      status: enriched.status,
      results: enriched.addresses.map((address) => ({
        rawAddress: address.rawAddress,
        status: address.status,
        candidates: address.candidates.map((candidate) => ({
          type: candidate.candidateType,
          value: candidate.value,
          confidence: candidate.confidence,
          score: candidate.score,
          explanation: candidate.explanation,
          sources: candidate.sources,
        })),
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}
