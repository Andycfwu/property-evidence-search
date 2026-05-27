import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { getPrisma } from "@/lib/db/prisma";

const reviewSchema = z.object({
  status: z.enum(["PENDING_REVIEW", "APPROVED", "REJECTED", "NEEDS_MORE_EVIDENCE", "MANUALLY_CORRECTED"]),
  communityOverride: z.string().trim().max(180).nullable().optional(),
  builderOverride: z.string().trim().max(180).nullable().optional(),
  note: z.string().trim().max(2000).nullable().optional(),
}).superRefine((input, context) => {
  if (
    input.status === "MANUALLY_CORRECTED"
    && !input.communityOverride?.trim()
    && !input.builderOverride?.trim()
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A manually corrected decision needs a community or builder override.",
      path: ["status"],
    });
  }
});

function optionalText(value: string | null | undefined) {
  return value || null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; addressId: string }> },
) {
  try {
    const { id, addressId } = await params;
    const input = reviewSchema.parse(await request.json());
    const prisma = getPrisma();
    const address = await prisma.evidenceJobAddress.findFirst({
      where: { id: addressId, jobId: id },
      include: { job: { select: { status: true } } },
    });

    if (!address) {
      return NextResponse.json({ error: "Evidence address not found." }, { status: 404 });
    }
    if (address.job.status !== "COMPLETED") {
      return NextResponse.json({ error: "Review decisions are available after enrichment is completed." }, { status: 409 });
    }

    const data = {
      status: input.status,
      communityOverride: optionalText(input.communityOverride),
      builderOverride: optionalText(input.builderOverride),
      note: optionalText(input.note),
    };
    const reviewDecision = await prisma.reviewDecision.upsert({
      where: { jobAddressId: addressId },
      update: data,
      create: { ...data, jobAddressId: addressId },
    });

    return NextResponse.json(reviewDecision);
  } catch (error) {
    return apiError(error);
  }
}
