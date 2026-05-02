import type {
  Conversation,
  ContentBlock,
  ToolUseBlock,
  ToolResultBlock,
  ToolUseArtifactBlock,
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

  const toolUseMap = buildToolUseMap(conv);

  for (const msg of conv.chat_messages) {
    parts.push(renderMessage(msg, opts, toolUseMap));
  }

  return parts.join("\n");
}

function renderFrontmatter(conv: Conversation, opts: RenderOptions): string {
  return [
    "---",
    `title: ${JSON.stringify(conv.name)}`,
    `chat_id: ${conv.uuid}`,
    `url: https://claude.ai/chat/${conv.uuid}`,
    `model: ${conv.model}`,
    `created: ${conv.created_at}`,
    `exported: ${opts.exportedAt}`,
    "---",
    "",
  ].join("\n");
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

  for (const block of msg.content) {
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
  for (const msg of conv.chat_messages) {
    for (const block of msg.content) {
      if (block.type === "tool_use") {
        const b = block as ToolUseBlock;
        map.set(b.id, b.name);
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
  const b = block as {
    type: string;
    text?: string;
    thinking?: string;
    id?: string;
    name?: string;
    input?: unknown;
    tool_use_id?: string;
    content?: Array<{ type: string; text?: string; [k: string]: unknown }>;
    title?: string;
    language?: string;
  };

  switch (b.type) {
    case "text":
      return b.text ?? "";

    case "thinking": {
      if (!opts.includeThinking) return null;
      return `> **Thinking**\n${toBlockquote(b.thinking ?? "")}`;
    }

    case "tool_use": {
      if (!opts.includeToolInputs) return null;
      const json = toBlockquote(JSON.stringify(b.input, null, 2));
      return `> **Tool call: ${b.name}**\n> \`\`\`json\n${json}\n> \`\`\``;
    }

    case "tool_result": {
      if (!opts.includeToolResults) return null;
      const toolResultBlock = block as ToolResultBlock;
      const name = toolUseMap.get(toolResultBlock.tool_use_id) ?? toolResultBlock.tool_use_id;
      const textParts = toolResultBlock.content
        .map((c) => (c.type === "text" ? c.text : JSON.stringify(c)))
        .join("\n");
      return `> **Tool result: ${name}**\n> \`\`\`\n${toBlockquote(textParts)}\n> \`\`\``;
    }

    case "tool_use_artifact": {
      const artBlock = block as ToolUseArtifactBlock;
      return `### ${artBlock.title}\n\n\`\`\`${artBlock.language}\n${artBlock.content}\n\`\`\``;
    }

    default:
      return `<!-- unsupported block: ${b.type} -->`;
  }
}
