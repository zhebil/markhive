import {
  fetchOrgId,
  fetchConversation,
  ClaudeAuthError,
  ClaudeNoOrgError,
  ClaudeNetworkError,
} from "../lib/claude-api.ts";

console.log("Markhive worker ready");

chrome.runtime.onInstalled.addListener(() => {
  console.log("Markhive worker installed");
});

type ExportRequest = { kind: "export"; chatId: string };
type ExportResponse =
  | { ok: true; conversation: unknown }
  | { ok: false; error: { code: "auth" | "no-org" | "network" | "api"; status?: number } };

chrome.runtime.onMessage.addListener(
  (message: unknown, _sender, sendResponse: (r: ExportResponse) => void) => {
    const req = message as ExportRequest;
    if (req.kind !== "export") return false;

    (async () => {
      try {
        const orgId = await fetchOrgId();
        const conversation = await fetchConversation(orgId, req.chatId);
        const c = conversation as { chat_messages?: Array<{ sender?: string; content?: unknown }> };
        const allBlocks: Array<Record<string, unknown>> = [];
        for (const m of c.chat_messages ?? []) {
          if (Array.isArray(m.content)) {
            for (const b of m.content as Array<Record<string, unknown>>) allBlocks.push(b);
          }
        }
        const typeCounts: Record<string, number> = {};
        for (const b of allBlocks) {
          const t = String(b.type ?? "?");
          typeCounts[t] = (typeCounts[t] ?? 0) + 1;
        }
        const samplesByType: Record<string, Record<string, unknown>> = {};
        for (const b of allBlocks) {
          const t = String(b.type ?? "?");
          if (!samplesByType[t]) samplesByType[t] = b;
        }
        const fallbackHits = allBlocks.filter(
          (b) => typeof b.text === "string" && (b.text as string).includes("not supported on your current device")
        );
        console.log("Markhive: block type counts", typeCounts);
        console.log("Markhive: sample of each block type", samplesByType);
        console.log("Markhive: blocks that contain the fallback text", fallbackHits);
        sendResponse({ ok: true, conversation });
      } catch (err) {
        if (err instanceof ClaudeAuthError) {
          sendResponse({ ok: false, error: { code: "auth" } });
        } else if (err instanceof ClaudeNoOrgError) {
          sendResponse({ ok: false, error: { code: "no-org" } });
        } else if (err instanceof ClaudeNetworkError) {
          sendResponse({ ok: false, error: { code: "network" } });
        } else {
          const status = (err as { status?: number }).status;
          sendResponse({ ok: false, error: { code: "api", status } });
        }
      }
    })();

    return true;
  }
);
