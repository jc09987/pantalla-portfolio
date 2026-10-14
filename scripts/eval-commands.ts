import { writeFileSync } from "node:fs";
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

async function main() {
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
    });
  }

  const passed = rows.filter((row) => row.pass).length;
  const report = {
    ranAt: new Date().toISOString(),
    model: rows.find((row) => row.model)?.model ?? null,
    note: process.env.OPENAI_API_KEY
      ? "Model ran. A row passes when the resolved command matches expect. The resolver uses the model only for an accepted shape; unknown and rejected shapes fall back to the regex parser."
      : "OPENAI_API_KEY was not set, so every row is the regex fallback. model, latencyMs, and costUsd stay null until npm run eval with a key.",
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
