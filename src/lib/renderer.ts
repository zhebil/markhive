import type {
  Conversation,
  ContentBlock,
  ChatMessage,
} from "./types.ts";

export type RenderOptions = {
  includeFrontmatter: boolean;
  includeThinking: boolean;
  includeToolInputs: boolean;
  includeToolResults: boolean;
  exportedAt: string;
};

export function render(conv: Conversation, opts: RenderOptions): string {
  const parts: string[] = [];

  if (opts.includeFrontmatter) {
    parts.push(renderFrontmatter(conv, opts));
  }

  // H1 makes the conversation title navigable in any markdown viewer
  const h1Title = conv.name || "Untitled";
  parts.push(`# ${h1Title}\n`);

  const toolUseMap = buildToolUseMap(conv);

  const messages = Array.isArray(conv.chat_messages) ? conv.chat_messages : [];
  for (const msg of messages) {
    parts.push(renderMessage(msg, opts, toolUseMap));
  }

  return parts.join("\n");
}

function renderFrontmatter(conv: Conversation, opts: RenderOptions): string {
  // JSON.stringify all interpolated values to prevent newline-injection in YAML.
  return [
    "---",
    `title: ${JSON.stringify(conv.name)}`,
    `chat_id: ${JSON.stringify(conv.uuid)}`,
    `url: ${JSON.stringify(`https://claude.ai/chat/${conv.uuid}`)}`,
    `model: ${JSON.stringify(conv.model)}`,
    `created: ${JSON.stringify(conv.created_at)}`,
    `exported: ${JSON.stringify(opts.exportedAt)}`,
    "---",
    "",
  ].join("\n");
}

function fenceFor(content: string): string {
  const longest = (content.match(/`+/g) ?? []).reduce((m, s) => Math.max(m, s.length), 0);
  return "`".repeat(Math.max(3, longest + 1));
}

function renderMessage(msg: ChatMessage, opts: RenderOptions, toolUseMap: Map<string, string>): string {
  const heading = msg.sender === "human" ? "## User" : "## Assistant";
  const lines: string[] = [heading, ""];

  if (msg.attachments?.length) {
    for (const att of msg.attachments) {
      lines.push(`[attachment: ${att.file_name}]`);
    }
    lines.push("");
  }

  const content = Array.isArray(msg.content) ? msg.content : [];
  for (const block of content) {
    const rendered = renderBlock(block, opts, toolUseMap);
    if (rendered !== null) {
      lines.push(rendered);
      lines.push("");
    }
  }

  return lines.join("\n");
}

function buildToolUseMap(conv: Conversation): Map<string, string> {
  const map = new Map<string, string>();
  const messages = Array.isArray(conv.chat_messages) ? conv.chat_messages : [];
  for (const msg of messages) {
    const content = Array.isArray(msg.content) ? msg.content : [];
    for (const block of content) {
      if (block.type === "tool_use") {
        map.set(block.id, block.name);
      }
    }
  }
  return map;
}

function toBlockquote(text: string): string {
  return text.split("\n").map((l) => `> ${l}`).join("\n");
}

function renderBlock(
  block: ContentBlock,
  opts: RenderOptions,
  toolUseMap: Map<string, string>
): string | null {
  switch (block.type) {
    case "text": {
      const text = block.text ?? "";
      // The /chat_conversations API substitutes tool_use blocks with a literal
      // placeholder text block. Suppress it to keep exports clean.
      if (text.includes("This block is not supported on your current device yet.")) {
        return null;
      }
      return text;
    }

    case "thinking": {
      if (!opts.includeThinking) return null;
      return `> **Thinking**\n${toBlockquote(block.thinking ?? "")}`;
    }

    case "tool_use": {
      if (!opts.includeToolInputs) return null;
      const inner = JSON.stringify(block.input, null, 2);
      const fence = fenceFor(inner);
      const json = toBlockquote(`${fence}json\n${inner}\n${fence}`);
      return `> **Tool call: ${block.name}**\n${json}`;
    }

    case "tool_result": {
      if (!opts.includeToolResults) return null;
      const name = toolUseMap.get(block.tool_use_id) ?? block.tool_use_id;
      const textParts = block.content
        .map((c) => (c.type === "text" ? c.text : JSON.stringify(c)))
        .join("\n");
      const fence = fenceFor(textParts);
      const body = toBlockquote(`${fence}\n${textParts}\n${fence}`);
      return `> **Tool result: ${name}**\n${body}`;
    }

    case "tool_use_artifact": {
      const fence = fenceFor(block.content);
      return `### ${block.title}\n\n${fence}${block.language}\n${block.content}\n${fence}`;
    }

    default: {
      const unknownType = (block as { type: string }).type;
      return `<!-- unsupported block: ${unknownType} -->`;
    }
  }
}
