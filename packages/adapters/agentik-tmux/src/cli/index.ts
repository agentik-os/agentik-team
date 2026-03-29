export function printAgentikTmuxStreamEvent(raw: string, _debug: boolean): void {
  const line = raw.trim();
  if (!line) return;

  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(line) as Record<string, unknown>;
  } catch {
    console.log(line);
    return;
  }

  const type = typeof parsed.type === "string" ? parsed.type : "";

  if (type === "system" && parsed.subtype === "init") {
    const model = typeof parsed.model === "string" ? parsed.model : "unknown";
    const sessionId = typeof parsed.session_id === "string" ? parsed.session_id : "";
    console.log(`[agentik-tmux] initialized (model: ${model}${sessionId ? `, session: ${sessionId}` : ""})`);
    return;
  }

  if (type === "assistant") {
    const message = typeof parsed.message === "object" && parsed.message !== null ? parsed.message as Record<string, unknown> : {};
    const content = Array.isArray(message.content) ? message.content : [];
    for (const block of content) {
      if (typeof block !== "object" || block === null || Array.isArray(block)) continue;
      const b = block as Record<string, unknown>;
      if (b.type === "text" && typeof b.text === "string") {
        process.stdout.write(b.text);
      }
    }
    return;
  }

  if (type === "result") {
    const subtype = typeof parsed.subtype === "string" ? parsed.subtype : "";
    if (parsed.is_error) {
      console.error(`[agentik-tmux] Error: ${subtype}`);
    } else {
      console.log(`[agentik-tmux] Done (${subtype})`);
    }
    return;
  }

  console.log(line);
}
