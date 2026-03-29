import type { UsageSummary } from "@agentik-os/adapter-utils";
import { asString, asNumber, parseObject, parseJson } from "@agentik-os/adapter-utils/server-utils";

export function parseAgentikTmuxStreamJson(stdout: string): {
  sessionId: string | null;
  model: string;
  summary: string;
  usage: UsageSummary | null;
} {
  let sessionId: string | null = null;
  let model = "";
  const assistantTexts: string[] = [];
  let finalResult: Record<string, unknown> | null = null;

  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const event = parseJson(line);
    if (!event) continue;

    const type = asString(event.type, "");
    if (type === "system" && asString(event.subtype, "") === "init") {
      sessionId = asString(event.session_id, sessionId ?? "") || sessionId;
      model = asString(event.model, model);
      continue;
    }

    if (type === "assistant") {
      sessionId = asString(event.session_id, sessionId ?? "") || sessionId;
      const message = parseObject(event.message);
      const content = Array.isArray(message.content) ? message.content : [];
      for (const entry of content) {
        if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
        const block = entry as Record<string, unknown>;
        if (asString(block.type, "") === "text") {
          const text = asString(block.text, "");
          if (text) assistantTexts.push(text);
        }
      }
      continue;
    }

    if (type === "result") {
      finalResult = event;
      sessionId = asString(event.session_id, sessionId ?? "") || sessionId;
    }
  }

  let usage: UsageSummary | null = null;
  if (finalResult) {
    const usageObj = parseObject(finalResult.usage);
    usage = {
      inputTokens: asNumber(usageObj.input_tokens, 0),
      outputTokens: asNumber(usageObj.output_tokens, 0),
      cachedInputTokens: asNumber(usageObj.cache_read_input_tokens, 0),
    };
  }

  return {
    sessionId,
    model,
    summary: assistantTexts.join("\n\n").trim(),
    usage,
  };
}
