import type { Conversation } from "./types.ts";
import { slugify } from "./slugify.ts";

export function buildFilename(conv: Conversation): string {
  const parsed = new Date(conv.created_at);
  const date = isNaN(parsed.getTime()) ? new Date() : parsed;
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const slug = slugify(conv.name ?? "");
  return `${yyyy}-${mm}-${dd}-${slug}.md`;
}
