import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import messages from "../evals/messages.json";
import { commandMatches, type ExpectedCommand } from "../lib/n8n/eval";
import { acceptModelCommand } from "../lib/n8n/schema";
import { resolveCommand } from "../lib/n8n/resolve";

const schemaProbes: Array<{ name: string; value: unknown; accept: boolean }> = [
  { name: "help", value: { type: "help" }, accept: true },
  { name: "unknown", value: { type: "unknown" }, accept: true },
  {
    name: "set available",
    value: { type: "set_available", query: "mango", available: false, kind: "leche" },
    accept: true,
  },
  { name: "delete menu", value: { type: "delete_menu" }, accept: false },
  {
    name: "extra key",
    value: { type: "help", note: "no" },
    accept: false,
  },
  {
    name: "price as string",
    value: { type: "set_price", price: "4.50", scoopCount: 2 },
    accept: false,
  },
  {
    name: "hide",
    value: { type: "hide_item", query: "gansito" },
    accept: true,
  },
];

const schemaChecks = schemaProbes.map((probe) => {
  const command = acceptModelCommand(probe.value);
  const pass = probe.accept ? command !== null : command === null;
  return { name: probe.name, pass, accept: probe.accept };
});

function loadEnvFile() {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

async function main() {
  loadEnvFile();
  const rows = [];
  for (const message of messages) {
    const resolved = await resolveCommand(message.text);
    const expect = message.expect as ExpectedCommand;
    rows.push({
      id: message.id,
      text: message.text,
      note: message.note,
      expect,
      pass: commandMatches(resolved.command, expect),
      source: resolved.source,
      actual: resolved.command,
      model: resolved.model.model,
      modelOutcome: resolved.model.outcome,
      latencyMs: resolved.model.latencyMs,
      costUsd: resolved.model.costUsd,
      error: resolved.model.error,
    });
  }

  const passed = rows.filter((row) => row.pass).length;
  const modelErrors = rows.filter((row) => row.modelOutcome === "error");
  const modelName = rows.find((row) => row.model)?.model ?? "the model";
  const note = !process.env.OPENAI_API_KEY
    ? "OPENAI_API_KEY was not set, so every row is the regex fallback. model, latencyMs, and costUsd stay null until npm run eval with a key."
    : modelErrors.length === rows.length
      ? `${modelName} failed for every message: ${(modelErrors[0]?.error ?? "request failed").replace(/\.+$/, "")}. Every row is the regex fallback. latencyMs is the failed request. costUsd stays null because no tokens were billed.`
      : "Each row is the resolved command. The model is used when it returns one of the closed shapes. Unknown, a rejected shape, or a model error falls back to the regex parser. latencyMs and costUsd are from that model call.";
  const report = {
    ranAt: new Date().toISOString(),
    model: rows.find((row) => row.model)?.model ?? null,
    note,
    summary: { total: rows.length, pass: passed, fail: rows.length - passed },
    schemaChecks,
    cases: rows,
  };

  const target = resolve(process.cwd(), "evals/results.json");
  writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `${passed}/${rows.length} pass · schema ${schemaChecks.filter((item) => item.pass).length}/${schemaChecks.length} · ${target}`,
  );
}

main();
