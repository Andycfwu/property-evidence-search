import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = await getPrisma().document.findUnique({
    where: { id },
    include: { chunks: { orderBy: { chunkIndex: "asc" } } },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }
  return NextResponse.json(document);
}

