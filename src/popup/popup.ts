import { parseChatId } from "../lib/url-parse.ts";
import { loadSettings, saveSettings } from "../lib/settings.ts";
import { render } from "../lib/renderer.ts";
import { buildFilename } from "../lib/filename.ts";
import { fetchConversationFromCache } from "../lib/idb-cache.ts";
import {
  loadDirectoryHandle,
  saveDirectoryHandle,
  clearDirectoryHandle,
  ensureWritePermission,
  writeFileToDirectory,
} from "../lib/fs-handle.ts";
import type { Conversation } from "../lib/types.ts";
import type { RenderOptions } from "../lib/renderer.ts";

const elChatTitle = document.getElementById("chat-title") as HTMLSpanElement;
const elStatus = document.getElementById("mh-status") as HTMLSpanElement;
const elFrontmatter = document.getElementById("opt-frontmatter") as HTMLInputElement;
const elThinking = document.getElementById("opt-thinking") as HTMLInputElement;
const elToolInputs = document.getElementById("opt-tool-inputs") as HTMLInputElement;
const elToolResults = document.getElementById("opt-tool-results") as HTMLInputElement;
const elOptions = document.getElementById("mh-options") as HTMLDivElement;
const elOptionsSummary = document.getElementById("mh-options-summary") as HTMLDivElement;
const elSummaryList = document.getElementById("mh-summary-list") as HTMLSpanElement;
const elEditOptions = document.getElementById("btn-edit-options") as HTMLButtonElement;
const elFolderName = document.getElementById("folder-name") as HTMLSpanElement;
const elChooseFolder = document.getElementById("btn-choose-folder") as HTMLButtonElement;
const elResetFolder = document.getElementById("btn-reset-folder") as HTMLButtonElement;
const elGenerate = document.getElementById("btn-generate") as HTMLButtonElement;
const elPreviewRegion = document.getElementById("preview-region") as HTMLDivElement;
const elPreviewSource = document.getElementById("preview-source") as HTMLSpanElement;
const elRegenerate = document.getElementById("btn-regenerate") as HTMLButtonElement;
const elPreviewTextarea = document.getElementById("preview-textarea") as HTMLTextAreaElement;
const elCopy = document.getElementById("btn-copy") as HTMLButtonElement;
const elDownload = document.getElementById("btn-download") as HTMLButtonElement;
const elToast = document.getElementById("toast") as HTMLDivElement;

let optsExpanded = false;

const TOGGLE_LABELS: Array<[HTMLInputElement, string]> = [
  [elFrontmatter, "frontmatter"],
  [elThinking, "thinking"],
  [elToolInputs, "tool inputs"],
  [elToolResults, "tool results"],
];

function renderOptionsBlock(): void {
  const previewOpen = !elPreviewRegion.classList.contains("hidden");
  const showSummary = previewOpen && !optsExpanded;
  elOptions.classList.toggle("hidden", showSummary);
  elOptionsSummary.classList.toggle("hidden", !showSummary);
  if (showSummary) {
    const active = TOGGLE_LABELS.filter(([el]) => el.checked).map(([, lbl]) => lbl);
    elSummaryList.textContent = "";
    if (active.length === 0) {
      const span = document.createElement("span");
      span.className = "mh-summary-empty";
      span.textContent = "none";
      elSummaryList.appendChild(span);
    } else {
      elSummaryList.textContent = active.join(" · ");
    }
  }
}

function setStatus(ready: boolean): void {
  elStatus.classList.toggle("is-off", !ready);
  elStatus.textContent = ready ? "ready" : "idle";
}

const CACHE_KEY = "markhive_last_export";

type CachedExport = {
  chatId: string;
  filename: string;
  markdown: string;
  source: "cache" | "api";
  generatedAt: string;
  chatTitle: string;
};

let toastTimer: ReturnType<typeof setTimeout> | null = null;
let activeTabId: number | null = null;
let currentFilename = "export.md";
let downloadDir: FileSystemDirectoryHandle | null = null;

function renderToastBody(text: string, filename?: string): void {
  elToast.textContent = "";
  const wrap = document.createElement("span");
  wrap.className = "mh-toast-text";
  if (filename && text.includes(filename)) {
    const idx = text.indexOf(filename);
    wrap.appendChild(document.createTextNode(text.slice(0, idx)));
    const strong = document.createElement("strong");
    strong.textContent = filename;
    wrap.appendChild(strong);
    wrap.appendChild(document.createTextNode(text.slice(idx + filename.length)));
  } else {
    wrap.textContent = text;
  }
  elToast.appendChild(wrap);
}

function showToast(text: string, kind: "info" | "error", filename?: string): void {
  if (toastTimer !== null) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  renderToastBody(text, filename);
  elToast.className = `mh-toast ${kind}`;
  if (kind === "info") {
    toastTimer = setTimeout(() => {
      elToast.className = "mh-toast hidden";
      elToast.textContent = "";
      toastTimer = null;
    }, 5000);
  }
}

function hideToast(): void {
  if (toastTimer !== null) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  elToast.className = "mh-toast hidden";
  elToast.textContent = "";
}

function mapErrorCode(code: string, status?: number): string {
  switch (code) {
    case "auth":
      return "You're signed out of Claude. Sign in and retry.";
    case "no-org":
      return "No Claude org found on this account.";
    case "network":
      return "Couldn't reach claude.ai. Check your connection.";
    case "api":
      return `Claude API error (${status ?? "?"}). The API may have changed - file an issue.`;
    default:
      return `Unexpected error: ${code}.`;
  }
}

function updateFolderUi(): void {
  elFolderName.textContent = "";
  if (downloadDir) {
    const host = document.createElement("span");
    host.className = "path-host";
    host.textContent = downloadDir.name;
    elFolderName.appendChild(host);
    elFolderName.title = downloadDir.name;
    elChooseFolder.textContent = "Change…";
    elResetFolder.classList.remove("hidden");
  } else {
    const def = document.createElement("span");
    def.className = "path-default";
    def.textContent = "Downloads (default)";
    elFolderName.appendChild(def);
    elFolderName.title = "";
    elChooseFolder.textContent = "Choose…";
    elResetFolder.classList.add("hidden");
  }
}

async function handleChooseFolder(): Promise<void> {
  if (typeof window.showDirectoryPicker !== "function") {
    showToast("Folder picker not supported by this browser.", "error");
    return;
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: "readwrite", id: "markhive-export" });
    const granted = await ensureWritePermission(handle);
    if (!granted) {
      showToast("Folder access denied.", "error");
      return;
    }
    await saveDirectoryHandle(handle);
    downloadDir = handle;
    updateFolderUi();
    showToast(`Saving to "${handle.name}".`, "info");
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") return;
    console.error("Markhive: folder pick failed", err);
    showToast("Couldn't pick folder.", "error");
  }
}

async function handleResetFolder(): Promise<void> {
  await clearDirectoryHandle();
  downloadDir = null;
  updateFolderUi();
  showToast("Reverted to default Downloads.", "info");
}

async function readCachedExport(): Promise<CachedExport | null> {
  const store = chrome.storage.session ?? chrome.storage.local;
  return new Promise((resolve) => {
    store.get(CACHE_KEY, (result) => {
      resolve((result[CACHE_KEY] as CachedExport | undefined) ?? null);
    });
  });
}

async function writeCachedExport(entry: CachedExport): Promise<void> {
  const store = chrome.storage.session ?? chrome.storage.local;
  return new Promise((resolve) => {
    store.set({ [CACHE_KEY]: entry }, resolve);
  });
}

function showPreview(entry: CachedExport): void {
  elPreviewTextarea.value = entry.markdown;
  currentFilename = entry.filename;

  elPreviewSource.textContent = "";
  const lbl = document.createElement("span");
  lbl.className = "src-label";
  lbl.textContent = entry.source === "cache" ? "from cache" : "fresh export";
  const time = document.createElement("span");
  time.className = "src-time";
  const d = new Date(entry.generatedAt);
  time.textContent = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  elPreviewSource.appendChild(lbl);
  elPreviewSource.appendChild(time);

  if (entry.chatTitle) {
    elChatTitle.textContent = entry.chatTitle;
    elChatTitle.title = entry.chatTitle;
  }
  elPreviewRegion.classList.remove("hidden");
  optsExpanded = false;
  renderOptionsBlock();
}

async function init(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ?? "";
  const chatId = parseChatId(url);
  activeTabId = tab?.id ?? null;

  setStatus(chatId !== null);
  if (chatId === null) {
    elGenerate.disabled = true;
    for (const [el] of TOGGLE_LABELS) {
      el.disabled = true;
      el.closest(".mh-toggle")?.classList.add("is-disabled");
    }
    showToast(
      "Open a Claude conversation to export. Markhive only runs on claude.ai/chat/* URLs.",
      "error",
    );
  }

  const settings = await loadSettings();
  elFrontmatter.checked = settings.includeFrontmatter;
  elThinking.checked = settings.includeThinking;
  elToolInputs.checked = settings.includeToolInputs;
  elToolResults.checked = settings.includeToolResults;

  try {
    downloadDir = await loadDirectoryHandle();
  } catch (err) {
    console.warn("Markhive: failed to load saved folder handle", err);
    downloadDir = null;
  }
  updateFolderUi();

  if (chatId !== null) {
    const cached = await readCachedExport();
    if (cached && cached.chatId === chatId) {
      showPreview(cached);
    }
  }

  elGenerate.addEventListener("click", () => {
    if (chatId === null) return;
    void handleGenerate(chatId);
  });

  elRegenerate.addEventListener("click", () => {
    if (chatId === null) return;
    void handleGenerate(chatId);
  });

  elCopy.addEventListener("click", () => {
    void handleCopy();
  });

  elDownload.addEventListener("click", () => {
    void handleDownload();
  });

  elChooseFolder.addEventListener("click", () => {
    void handleChooseFolder();
  });

  elResetFolder.addEventListener("click", () => {
    void handleResetFolder();
  });

  elEditOptions.addEventListener("click", () => {
    optsExpanded = true;
    renderOptionsBlock();
  });
}

async function handleGenerate(chatId: string): Promise<void> {
  hideToast();
  elGenerate.disabled = true;
  elRegenerate.disabled = true;

  try {
    const settings = {
      includeFrontmatter: elFrontmatter.checked,
      includeThinking: elThinking.checked,
      includeToolInputs: elToolInputs.checked,
      includeToolResults: elToolResults.checked,
      filenameTemplate: "date-title" as const,
    };

    await saveSettings(settings);

    type ExportResponse =
      | { ok: true; conversation: unknown }
      | { ok: false; error: { code: string; status?: number } };

    let conversation: unknown = null;
    let source: "cache" | "api" = "cache";

    if (activeTabId !== null) {
      try {
        conversation = await fetchConversationFromCache(activeTabId, chatId);
      } catch (err) {
        console.warn("Markhive: IDB cache read failed, falling back to API", err);
        conversation = null;
      }
    }

    if (!conversation) {
      source = "api";
      let response: ExportResponse;
      try {
        response = (await chrome.runtime.sendMessage({ kind: "export", chatId })) as ExportResponse;
      } catch {
        showToast(mapErrorCode("network"), "error");
        return;
      }
      if (!response.ok) {
        showToast(mapErrorCode(response.error.code, response.error.status), "error");
        return;
      }
      conversation = response.conversation;
    }
    console.log(`Markhive: conversation source = ${source}`);

    const conv = conversation as Conversation;
    const opts: RenderOptions = {
      includeFrontmatter: settings.includeFrontmatter,
      includeThinking: settings.includeThinking,
      includeToolInputs: settings.includeToolInputs,
      includeToolResults: settings.includeToolResults,
      exportedAt: new Date().toISOString(),
    };

    const markdown = render(conv, opts);
    const filename = buildFilename(conv);
    const chatTitle = conv.name ?? "";

    if (chatTitle) {
      elChatTitle.textContent = chatTitle;
      elChatTitle.title = chatTitle;
    }

    const entry: CachedExport = {
      chatId,
      filename,
      markdown,
      source,
      generatedAt: new Date().toISOString(),
      chatTitle,
    };
    await writeCachedExport(entry);
    showPreview(entry);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Markhive generate failed:", err);
    showToast(`Couldn't render conversation: ${message}`, "error");
  } finally {
    elGenerate.disabled = false;
    elRegenerate.disabled = false;
  }
}

async function handleCopy(): Promise<void> {
  const text = elPreviewTextarea.value;
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied.", "info");
  } catch {
    showToast("Copy failed. Try selecting and copying manually.", "error");
  }
}

async function handleDownload(): Promise<void> {
  const text = elPreviewTextarea.value;

  if (downloadDir) {
    try {
      const granted = await ensureWritePermission(downloadDir);
      if (!granted) {
        showToast("Folder permission denied. Falling back to Downloads.", "error");
      } else {
        await writeFileToDirectory(downloadDir, currentFilename, text);
        const fullName = `${downloadDir.name}/${currentFilename}`;
        showToast(`Saved to ${fullName}`, "info", fullName);
        return;
      }
    } catch (err) {
      console.error("Markhive: write to chosen folder failed", err);
      showToast(`Couldn't write to ${downloadDir.name}. Falling back to Downloads.`, "error");
    }
  }

  const blob = new Blob([text], { type: "text/markdown" });
  const blobUrl = URL.createObjectURL(blob);

  chrome.downloads.download({ url: blobUrl, filename: currentFilename, saveAs: false }, (downloadId) => {
    if (chrome.runtime.lastError) {
      URL.revokeObjectURL(blobUrl);
      showToast(`Download failed: ${chrome.runtime.lastError.message}`, "error");
      return;
    }
    const fallbackTimer = setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      chrome.downloads.onChanged.removeListener(onChanged);
    }, 30_000);

    function onChanged(delta: chrome.downloads.DownloadDelta): void {
      if (delta.id === downloadId && delta.state?.current === "complete") {
        clearTimeout(fallbackTimer);
        URL.revokeObjectURL(blobUrl);
        chrome.downloads.onChanged.removeListener(onChanged);
      }
    }

    chrome.downloads.onChanged.addListener(onChanged);
  });

  showToast("Downloaded.", "info");
}

void init();
