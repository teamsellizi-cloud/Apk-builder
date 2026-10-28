import { NextResponse } from "next/server";
import { analyzeZipBuffer } from "@/lib/zip-analyzer";
import { requireAuth, unauthorizedResponse } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (!user) {
      return unauthorizedResponse();
    }

    const rate = checkRateLimit(`analyze_zip_${user.userId}`, 20, 60000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a minute." },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No ZIP file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const analysis = await analyzeZipBuffer(arrayBuffer, file.name);

    return NextResponse.json({
      success: analysis.isSafe && !analysis.error,
      analysis,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Failed to analyze ZIP file" }, { status: 500 });
  }
}
