import { render } from "./renderer.ts";
import { buildFilename } from "./filename.ts";
import type { RenderOptions } from "./renderer.ts";
import type { Conversation } from "./types.ts";

export async function exportConversation(
  chatId: string,
  opts: RenderOptions,
  conv: unknown
): Promise<{ filename: string; markdown: string }> {
  void chatId;
  const filename = buildFilename(conv as Conversation);
  const markdown = render(conv as Conversation, opts);
  return { filename, markdown };
}
