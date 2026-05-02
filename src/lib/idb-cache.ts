// Reads a conversation from the page's IndexedDB react-query cache by injecting
// a script into the active claude.ai tab. The cache contains the original
// streamed payloads (with real tool_use / tool_result blocks), unlike the
// REST endpoint which substitutes tool blocks with a placeholder text.

type ReactQueryCache = {
  clientState?: {
    queries?: Array<{ queryKey?: unknown; state?: { data?: unknown } }>;
  };
};

// This function runs in the page's isolated world via chrome.scripting.executeScript.
// It must be self-contained: no closures, no imports, JSON-serializable args/return.
function readConversationFromCacheInPage(chatId: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open("keyval-store");
    open.onerror = () => reject(new Error("Failed to open keyval-store"));
    open.onsuccess = () => {
      const db = open.result;
      let req: IDBRequest;
      try {
        req = db.transaction("keyval", "readonly").objectStore("keyval").get("react-query-cache");
      } catch (err) {
        db.close();
        reject(err);
        return;
      }
      req.onerror = () => {
        db.close();
        reject(new Error("Failed to read react-query-cache"));
      };
      req.onsuccess = () => {
        db.close();
        const cache = req.result as ReactQueryCache | undefined;
        const queries = cache?.clientState?.queries ?? [];
        const matches = queries.filter((q) => {
          const qk = q.queryKey;
          return Array.isArray(qk) && qk.includes(chatId);
        });
        const best = matches.find((q) => {
          const d = q.state?.data as { chat_messages?: unknown } | undefined;
          return d && Array.isArray(d.chat_messages);
        });
        resolve(best?.state?.data ?? null);
      };
    };
  });
}

export async function fetchConversationFromCache(tabId: number, chatId: string): Promise<unknown | null> {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: "ISOLATED",
    func: readConversationFromCacheInPage,
    args: [chatId],
  });
  return results[0]?.result ?? null;
}
