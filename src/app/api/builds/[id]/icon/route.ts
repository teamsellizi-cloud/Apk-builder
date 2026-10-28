import { NextResponse } from "next/server";
import { db } from "@/db";
import { builds } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifySignedDownloadToken } from "@/lib/signed-urls";

// Lets the GitHub runner fetch the app icon with a signed, expiring link
// instead of receiving it inside the (size-limited) workflow inputs.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = new URL(req.url).searchParams.get("token");

    if (!token) {
      return new NextResponse("Unauthorized: Missing token.", { status: 401 });
    }
    if (!verifySignedDownloadToken(id, token)) {
      return new NextResponse("Forbidden: Expired or invalid token.", { status: 403 });
    }

    const records = await db.select().from(builds).where(eq(builds.id, id)).limit(1);
    if (records.length === 0) {
      return new NextResponse("Build not found.", { status: 404 });
    }

    const build = records[0];
    let icon = build.appIconUrl || "";
    if (!icon.startsWith("data:image/")) {
      try {
        const cfg = JSON.parse(build.configJson || "{}") as { iconDataUrl?: string };
        icon = cfg.iconDataUrl || "";
      } catch {
        icon = "";
      }
    }
    if (!icon.startsWith("data:image/")) {
      return new NextResponse("No custom icon for this build.", { status: 404 });
    }

    return new NextResponse(icon, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (err: unknown) {
    return new NextResponse(`Error: ${(err as Error).message}`, { status: 500 });
  }
}
