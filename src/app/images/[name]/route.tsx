import { ImageResponse } from "next/og";
import { ART } from "@/lib/brand-art";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const art = ART[name];

  if (!art) {
    return new Response("Not found", { status: 404 });
  }

  const svg = art.svg(art.size);
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUri} width={art.size} height={art.size} alt="" />
      </div>
    ),
    {
      width: art.size,
      height: art.size,
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=31536000" },
    }
  );
}
