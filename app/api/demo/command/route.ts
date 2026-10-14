import { runDemoTurn, type DemoMode } from "@/lib/demo/run";
import type { MenuSnapshot } from "@/lib/menu/types";

export async function POST(request: Request) {
  let body: { mode?: DemoMode; text?: string; snapshot?: MenuSnapshot };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const mode = body.mode ?? "message";
  if (mode !== "message" && mode !== "bad_signature" && mode !== "unknown") {
    return Response.json({ ok: false, error: "invalid mode" }, { status: 400 });
  }

  const trace = await runDemoTurn({ mode, text: body.text, snapshot: body.snapshot });
  return Response.json({ ok: trace.boardChanged || trace.signature === "pass", ...trace });
}
