export function parseChatId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "claude.ai") return null;
    const match = parsed.pathname.match(/^\/chat\/([0-9a-f-]+)/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
