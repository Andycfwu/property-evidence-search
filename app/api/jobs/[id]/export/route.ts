import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db/prisma";
import {
  createReviewPackageCsv,
  createReviewPackageMarkdown,
  reviewPackageFilename,
} from "@/lib/exports/review-package";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const format = new URL(request.url).searchParams.get("format");
  if (format !== "csv" && format !== "md") {
    return NextResponse.json({ error: "Choose either CSV or Markdown export format." }, { status: 400 });
  }

  const job = await getPrisma().evidenceJob.findUnique({
    where: { id },
    include: {
      addresses: {
        orderBy: { createdAt: "asc" },
        include: {
          reviewDecision: true,
          candidates: {
            orderBy: { score: "desc" },
            include: {
              sources: {
                orderBy: { score: "desc" },
                include: { document: true },
              },
            },
          },
        },
      },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Evidence job not found." }, { status: 404 });
  }
  if (job.status !== "COMPLETED") {
    return NextResponse.json({ error: "Review packages are available after an evidence run is completed." }, { status: 409 });
  }

  const body = format === "csv" ? createReviewPackageCsv(job) : createReviewPackageMarkdown(job);
  const contentType = format === "csv" ? "text/csv; charset=utf-8" : "text/markdown; charset=utf-8";
  return new Response(body, {
    headers: {
      "Content-Disposition": `attachment; filename="${reviewPackageFilename(job.name, format)}"`,
      "Content-Type": contentType,
    },
  });
}
