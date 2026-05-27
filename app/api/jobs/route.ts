import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { getPrisma } from "@/lib/db/prisma";
import { parseAddress } from "@/lib/enrichment/address-parser";

const createJobSchema = z.object({
  name: z.string().trim().min(2).max(140),
  addresses: z.array(z.string().trim().min(5)).min(1).max(500),
});

export async function GET() {
  const jobs = await getPrisma().evidenceJob.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { addresses: true } } },
  });
  return NextResponse.json(jobs);
}

export async function POST(request: Request) {
  try {
    const input = createJobSchema.parse(await request.json());
    const job = await getPrisma().evidenceJob.create({
      data: {
        name: input.name,
        addresses: {
          create: input.addresses.map((rawAddress) => parseAddress(rawAddress)),
        },
      },
      include: { addresses: true },
    });
    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

