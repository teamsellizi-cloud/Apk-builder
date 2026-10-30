import { NextResponse } from "next/server";
import { db } from "@/db";
import { builds } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifySignedDownloadToken } from "@/lib/signed-urls";

// The GitHub runner fetches the icon and splash image here with a signed, expiring link.
// They are not sent as workflow inputs because GitHub limits inputs to about 65 KB.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = new URL(req.url).searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized: Missing token." }, { status: 401 });
    }
    if (!verifySignedDownloadToken(id, token)) {
      return NextResponse.json({ error: "Forbidden: Expired or invalid token." }, { status: 403 });
    }

    const records = await db.select().from(builds).where(eq(builds.id, id)).limit(1);
    if (records.length === 0) {
      return NextResponse.json({ error: "Build not found." }, { status: 404 });
    }

    const build = records[0];
    let cfg: { iconDataUrl?: string; splashImageDataUrl?: string; googleServicesJson?: string } = {};
    try {
      cfg = JSON.parse(build.configJson || "{}");
    } catch {
      cfg = {};
    }

    const icon = cfg.iconDataUrl || build.appIconUrl || "";
    return NextResponse.json(
      {
        iconDataUrl: icon.startsWith("data:image/") ? icon : "",
        splashImageDataUrl: (cfg.splashImageDataUrl || "").startsWith("data:image/") ? cfg.splashImageDataUrl : "",
        googleServicesJson: typeof cfg.googleServicesJson === "string" ? cfg.googleServicesJson : "",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
