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
        const sample = c.chat_messages?.slice(0, 2).map((m) => ({
          sender: m.sender,
          contentType: Array.isArray(m.content) ? "array" : typeof m.content,
          contentSample: Array.isArray(m.content) ? m.content.slice(0, 2) : m.content,
        }));
        console.log("Markhive: conversation shape sample", sample);
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
