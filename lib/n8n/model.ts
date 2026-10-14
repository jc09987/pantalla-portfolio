import { LA_MICHOACANA_SNAPSHOT } from "@/lib/menu/seeds/la-michoacana";
import { acceptModelCommand, COMMAND_SCHEMA_TEXT } from "@/lib/n8n/schema";
import type { ParsedCommand } from "@/lib/n8n/parse";

export type ModelOutcome =
  | "accepted"
  | "unknown"
  | "rejected_shape"
  | "skipped"
  | "error"
  | "not_called";

export type ModelTrace = {
  outcome: ModelOutcome;
  model: string | null;
  latencyMs: number | null;
  costUsd: number | null;
  command: ParsedCommand | null;
};

const DEFAULT_MODEL = "gpt-4o-mini";

/** USD per token. List price; unknown models leave cost null. */
const USD_PER_TOKEN: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
  "gpt-4.1-mini": { input: 0.4 / 1_000_000, output: 1.6 / 1_000_000 },
  "gpt-4.1-nano": { input: 0.1 / 1_000_000, output: 0.4 / 1_000_000 },
};

export function commandModelName() {
  return process.env.PANTALLA_COMMAND_MODEL?.trim() || DEFAULT_MODEL;
}

export function costForUsage(
  model: string,
  promptTokens: number | null,
  completionTokens: number | null,
) {
  const rate = USD_PER_TOKEN[model];
  if (!rate || promptTokens == null || completionTokens == null) return null;
  const cost = promptTokens * rate.input + completionTokens * rate.output;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

function catalogPrompt() {
  const lines = LA_MICHOACANA_SNAPSHOT.sections.map((section) => {
    const names = section.items.map((item) => item.name).join(", ");
    return `${section.kind}: ${names}`;
  });
  const tiers = LA_MICHOACANA_SNAPSHOT.priceTiers
    .map((tier) => `${tier.scoops} scoops (${tier.label})`)
    .join(", ");
  return `${lines.join("\n")}\nPrices: ${tiers}`;
}

function emptyTrace(outcome: ModelOutcome, model: string | null = null): ModelTrace {
  return { outcome, model, latencyMs: null, costUsd: null, command: null };
}

export async function interpretWithModel(text: string): Promise<ModelTrace> {
  const key = process.env.OPENAI_API_KEY?.trim();
  const model = commandModelName();
  if (!key) return emptyTrace("skipped");

  const started = Date.now();
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(12_000),
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 180,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You map one store message to one JSON object.",
              "Return only one of these shapes. No other keys, no other type:",
              COMMAND_SCHEMA_TEXT,
              "kind is agua or leche when the message says which. Omit kind when it does not.",
              "hide means type hide_item. A photo with no item name is unknown.",
              "If the message is not one of those commands, return {\"type\":\"unknown\"}.",
              "Never invent a command for email blasts, deletes, theme changes, or anything outside the shapes.",
              "Catalog:",
              catalogPrompt(),
            ].join("\n"),
          },
          { role: "user", content: text },
        ],
      }),
    });

    const latencyMs = Date.now() - started;
    const body = (await response.json()) as {
      error?: { message?: string };
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      choices?: Array<{ message?: { content?: string } }>;
    };
    if (!response.ok) {
      return { outcome: "error", model, latencyMs, costUsd: null, command: null };
    }

    const costUsd = costForUsage(
      model,
      body.usage?.prompt_tokens ?? null,
      body.usage?.completion_tokens ?? null,
    );
    const content = body.choices?.[0]?.message?.content;
    let raw: unknown = null;
    try {
      raw = content ? JSON.parse(content) : null;
    } catch {
      raw = null;
    }
    const command = acceptModelCommand(raw);
    if (!command) {
      return { outcome: "rejected_shape", model, latencyMs, costUsd, command: null };
    }
    if (command.type === "unknown") {
      return { outcome: "unknown", model, latencyMs, costUsd, command };
    }
    return { outcome: "accepted", model, latencyMs, costUsd, command };
  } catch {
    return {
      outcome: "error",
      model,
      latencyMs: Date.now() - started,
      costUsd: null,
      command: null,
    };
  }
}
