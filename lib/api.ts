import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function apiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid request", issues: error.flatten() },
      { status: 400 },
    );
  }

  console.error(error);
  return NextResponse.json({ error: "Request could not be completed." }, { status: 500 });
}

