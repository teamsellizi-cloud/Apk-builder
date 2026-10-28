import { NextResponse } from "next/server";
import { db } from "@/db";
import { builds } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifySignedDownloadToken } from "@/lib/signed-urls";
import { downloadArtifactBuffer } from "@/lib/storage";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return new NextResponse("Unauthorized: Missing token.", { status: 401 });
    }

    const isValid = verifySignedDownloadToken(id, token);
    if (!isValid) {
      return new NextResponse("Forbidden: Expired or invalid download token.", { status: 403 });
    }

    const records = await db.select().from(builds).where(eq(builds.id, id)).limit(1);
    if (records.length === 0) {
      return new NextResponse("Build not found.", { status: 404 });
    }

    const build = records[0];
    if (!build.zipStoragePath) {
      return new NextResponse("No ZIP source file attached to this build.", { status: 404 });
    }

    const buffer = await downloadArtifactBuffer(build.zipStoragePath);
    const fileName = build.zipFileName || `${build.packageId}-source.zip`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return new NextResponse(`Error downloading ZIP: ${error.message}`, { status: 500 });
  }
}
