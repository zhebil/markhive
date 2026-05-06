// Reads a conversation from the page's IndexedDB react-query cache by injecting
// a script into the active claude.ai tab. The cache contains the original
// streamed payloads (with real tool_use / tool_result blocks), unlike the
// REST endpoint which substitutes tool blocks with a placeholder text.

export type ReactQueryCache = {
  clientState?: {
    queries?: Array<{ queryKey?: unknown; state?: { data?: unknown } }>;
  };
};

// Finds the conversation object inside the react-query cache by walking each
// query's data (depth-bounded) for an object with `uuid === chatId` and an
// array `chat_messages`. The queryKey is intentionally ignored so changes to
// its shape don't break us; rename of either field gives a loud null.
export function findConversationInCache(cache: ReactQueryCache | undefined, chatId: string): unknown | null {
  const walk = (node: unknown, depth: number): unknown | null => {
    if (depth > 4 || node === null || typeof node !== "object") return null;
    const obj = node as Record<string, unknown>;
    if (obj["uuid"] === chatId && Array.isArray(obj["chat_messages"])) return obj;
    const children = Array.isArray(node) ? node : Object.values(obj);
    for (const child of children) {
      const found = walk(child, depth + 1);
      if (found !== null) return found;
    }
    return null;
  };

  for (const q of cache?.clientState?.queries ?? []) {
    const found = walk(q.state?.data, 0);
    if (found !== null) return found;
  }
  return null;
}

// Runs in the page's isolated world via chrome.scripting.executeScript. Must
// be self-contained (no closures, no imports). Returns the raw cache blob and
// lets the caller do the matching, so we don't duplicate logic across realms.
function readReactQueryCacheInPage(): Promise<unknown> {
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
        resolve(req.result ?? null);
      };
    };
  });
}

export async function fetchConversationFromCache(tabId: number, chatId: string): Promise<unknown | null> {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: "ISOLATED",
    func: readReactQueryCacheInPage,
  });
  return findConversationInCache(results[0]?.result as ReactQueryCache | undefined, chatId);
}
