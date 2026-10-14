import { interpretWithModel, type ModelTrace } from "@/lib/n8n/model";
import { parseCommand, type ParsedCommand } from "@/lib/n8n/parse";

export type ResolveResult = {
  command: ParsedCommand;
  source: "model" | "regex";
  model: ModelTrace;
};

/**
 * HMAC and the sender allowlist run before this.
 * A model command is used only when it is one of the closed shapes and it
 * is not "unknown". Unknown, a rejected shape, a model error, or no API key
 * all fall through to the regex parser.
 */
export async function resolveCommand(text: string): Promise<ResolveResult> {
  const model = await interpretWithModel(text);
  if (model.outcome === "accepted" && model.command && model.command.type !== "unknown") {
    return { command: model.command, source: "model", model };
  }
  return { command: parseCommand(text), source: "regex", model };
}
