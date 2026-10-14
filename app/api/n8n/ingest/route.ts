import { verifyN8nSignature } from "@/lib/n8n/hmac";
import { ingestCommand } from "@/lib/n8n/ingest";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json(
      { ok: false, error: "N8N_WEBHOOK_SECRET is not set" },
      { status: 503 },
    );
  }

  const raw = await request.text();
  const signature = request.headers.get("x-n8n-signature");
  if (!verifyN8nSignature(raw, signature, secret)) {
    return Response.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const result = await ingestCommand(body);
  if (result.published && typeof (body as { storeSlug?: string }).storeSlug === "string") {
    revalidatePath(`/v/${(body as { storeSlug: string }).storeSlug}`);
    revalidatePath("/admin");
    revalidatePath("/admin/automations");
  }

  return Response.json(
    {
      ok: result.ok,
      status: result.status,
      reply: result.reply,
      published: result.published,
    },
    { status: result.httpStatus },
  );
}