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

function mustGet<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Markhive: missing #${id}`);
  return el as T;
}

const elChatTitle = mustGet<HTMLSpanElement>("chat-title");
const elStatus = mustGet<HTMLSpanElement>("mh-status");
const elFrontmatter = mustGet<HTMLInputElement>("opt-frontmatter");
const elThinking = mustGet<HTMLInputElement>("opt-thinking");
const elToolInputs = mustGet<HTMLInputElement>("opt-tool-inputs");
const elToolResults = mustGet<HTMLInputElement>("opt-tool-results");
const elOptions = mustGet<HTMLDivElement>("mh-options");
const elOptionsSummary = mustGet<HTMLDivElement>("mh-options-summary");
const elSummaryList = mustGet<HTMLSpanElement>("mh-summary-list");
const elEditOptions = mustGet<HTMLButtonElement>("btn-edit-options");
const elFolderName = mustGet<HTMLSpanElement>("folder-name");
const elChooseFolder = mustGet<HTMLButtonElement>("btn-choose-folder");
const elResetFolder = mustGet<HTMLButtonElement>("btn-reset-folder");
const elGenerate = mustGet<HTMLButtonElement>("btn-generate");
const elPreviewRegion = mustGet<HTMLDivElement>("preview-region");
const elPreviewSource = mustGet<HTMLSpanElement>("preview-source");
const elRegenerate = mustGet<HTMLButtonElement>("btn-regenerate");
const elPreviewTextarea = mustGet<HTMLTextAreaElement>("preview-textarea");
const elCopy = mustGet<HTMLButtonElement>("btn-copy");
const elDownload = mustGet<HTMLButtonElement>("btn-download");
const elToast = mustGet<HTMLDivElement>("toast");

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
  if (!showSummary) return;
  const active = TOGGLE_LABELS.filter(([el]) => el.checked).map(([, lbl]) => lbl);
  elSummaryList.classList.toggle("mh-summary-empty", active.length === 0);
  elSummaryList.textContent = active.length === 0 ? "none" : active.join(" · ");
}

const CACHE_KEY = "markhive_last_export";

type CachedExport = {
  chatId: string;
  filename: string;
  markdown: string;
  generatedAt: string;
  chatTitle: string;
};

let toastTimer: ReturnType<typeof setTimeout> | null = null;
let activeTabId: number | null = null;
let currentFilename = "export.md";
let downloadDir: FileSystemDirectoryHandle | null = null;

function showToast(text: string, kind: "info" | "error", filename?: string): void {
  if (toastTimer !== null) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  const wrap = document.createElement("span");
  wrap.className = "mh-toast-text";
  const idx = filename ? text.indexOf(filename) : -1;
  if (idx >= 0 && filename) {
    wrap.append(text.slice(0, idx));
    const strong = document.createElement("strong");
    strong.textContent = filename;
    wrap.append(strong, text.slice(idx + filename.length));
  } else {
    wrap.textContent = text;
  }
  elToast.replaceChildren(wrap);
  elToast.className = `mh-toast ${kind}`;
  if (kind === "info") {
    toastTimer = setTimeout(hideToast, 5000);
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

function updateFolderUi(): void {
  const span = document.createElement("span");
  span.className = downloadDir ? "path-host" : "path-default";
  span.textContent = downloadDir ? downloadDir.name : "Downloads (default)";
  elFolderName.replaceChildren(span);
  elFolderName.title = downloadDir?.name ?? "";
  elChooseFolder.textContent = downloadDir ? "Change…" : "Choose…";
  elResetFolder.classList.toggle("hidden", !downloadDir);
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
  return new Promise((resolve) => {
    chrome.storage.session.get(CACHE_KEY, (result) => {
      resolve((result[CACHE_KEY] as CachedExport | undefined) ?? null);
    });
  });
}

async function writeCachedExport(entry: CachedExport): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.session.set({ [CACHE_KEY]: entry }, () => resolve());
  });
}

function showPreview(entry: CachedExport): void {
  elPreviewTextarea.value = entry.markdown;
  currentFilename = entry.filename;

  const t = new Date(entry.generatedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const time = document.createElement("span");
  time.className = "src-time";
  time.textContent = `exported ${t}`;
  elPreviewSource.replaceChildren(time);

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

  const ready = chatId !== null;
  elStatus.classList.toggle("is-off", !ready);
  elStatus.textContent = ready ? "ready" : "idle";
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

async function commitExport(chatId: string, conv: Conversation): Promise<void> {
  const opts: RenderOptions = {
    includeFrontmatter: elFrontmatter.checked,
    includeThinking: elThinking.checked,
    includeToolInputs: elToolInputs.checked,
    includeToolResults: elToolResults.checked,
    exportedAt: new Date().toISOString(),
  };

  const entry: CachedExport = {
    chatId,
    filename: buildFilename(conv),
    markdown: render(conv, opts),
    generatedAt: new Date().toISOString(),
    chatTitle: conv.name ?? "",
  };
  await writeCachedExport(entry);
  showPreview(entry);
}

async function handleGenerate(chatId: string): Promise<void> {
  hideToast();
  elGenerate.disabled = true;
  elRegenerate.disabled = true;

  try {
    await saveSettings({
      includeFrontmatter: elFrontmatter.checked,
      includeThinking: elThinking.checked,
      includeToolInputs: elToolInputs.checked,
      includeToolResults: elToolResults.checked,
      filenameTemplate: "date-title",
    });

    const conv = activeTabId === null
      ? null
      : await fetchConversationFromCache(activeTabId, chatId);
    if (!conv) {
      showToast(
        "No cached conversation. Open this chat in the tab so it loads, then click Regenerate.",
        "error",
      );
      return;
    }
    await commitExport(chatId, conv as Conversation);
  } catch (err) {
    console.error("Markhive generate failed:", err);
    showToast("Couldn't render conversation. See console for details.", "error");
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
        await clearDirectoryHandle();
        downloadDir = null;
        updateFolderUi();
        showToast(
          "Folder permission expired - reverted to Downloads. Choose the folder again to resume saving there.",
          "error",
        );
      } else {
        await writeFileToDirectory(downloadDir, currentFilename, text);
        const fullName = `${downloadDir.name}/${currentFilename}`;
        showToast(`Saved to ${fullName}`, "info", fullName);
        return;
      }
    } catch (err) {
      console.error("Markhive: write to chosen folder failed", err);
      const errName = (err as { name?: string })?.name;
      if (errName === "NotAllowedError" || errName === "SecurityError") {
        const previousName = downloadDir?.name ?? "chosen folder";
        await clearDirectoryHandle();
        downloadDir = null;
        updateFolderUi();
        showToast(
          `Lost permission for "${previousName}" - reverted to Downloads. Choose the folder again to resume saving there.`,
          "error",
        );
      } else {
        showToast(
          `Couldn't write to ${downloadDir?.name ?? "chosen folder"}. Falling back to Downloads.`,
          "error",
        );
      }
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

    function onChanged(delta: chrome.downloads.DownloadDelta): void {
      if (delta.id === downloadId && delta.state?.current === "complete") {
        clearTimeout(fallbackTimer);
        URL.revokeObjectURL(blobUrl);
        chrome.downloads.onChanged.removeListener(onChanged);
      }
    }

    const fallbackTimer = setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      chrome.downloads.onChanged.removeListener(onChanged);
    }, 30_000);

    chrome.downloads.onChanged.addListener(onChanged);
  });

  showToast("Downloaded.", "info");
}

void init();
