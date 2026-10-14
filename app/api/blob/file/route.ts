import { isPrivateBlobUrl, isVercelBlobUrl } from "@/lib/blob/display";
import { get } from "@vercel/blob";

export async function GET(request: Request) {
  const src = new URL(request.url).searchParams.get("src") ?? "";
  if (!isVercelBlobUrl(src) || !isPrivateBlobUrl(src)) {
    return new Response("Not found", { status: 404 });
  }

  const result = await get(src, { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
