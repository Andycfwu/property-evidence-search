import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getPrisma().evidenceJob.findUnique({
    where: { id },
    include: {
      addresses: {
        orderBy: { createdAt: "asc" },
        include: {
          reviewDecision: true,
          candidates: {
            orderBy: { score: "desc" },
            include: { sources: { include: { document: { select: { title: true } } } } },
          },
        },
      },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Evidence job not found." }, { status: 404 });
  }
  return NextResponse.json(job);
}
