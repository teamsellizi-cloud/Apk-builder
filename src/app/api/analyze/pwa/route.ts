import { NextResponse } from "next/server";
import { analyzePWA } from "@/lib/pwa-analyzer";
import { requireAuth, unauthorizedResponse } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (!user) {
      return unauthorizedResponse();
    }

    const rate = checkRateLimit(`analyze_pwa_${user.userId}`, 30, 60000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a minute." },
        { status: 429 }
      );
    }

    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const analysis = await analyzePWA(url);
    return NextResponse.json({ success: true, analysis });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Failed to analyze PWA" }, { status: 500 });
  }
}
