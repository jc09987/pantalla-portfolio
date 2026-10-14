import { createHmac, timingSafeEqual } from "node:crypto";

export function signN8nBody(rawBody: string, secret: string) {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function verifyN8nSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
) {
  if (!signature) return false;
  const provided = signature.replace(/^sha256=/i, "").trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(provided) || provided.length % 2 !== 0) return false;

  const expected = signN8nBody(rawBody, secret);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(provided, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}