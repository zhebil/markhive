import { parseChatId } from "../lib/url-parse.ts";
import { loadSettings, saveSettings } from "../lib/settings.ts";
import { render } from "../lib/renderer.ts";
import { buildFilename } from "../lib/filename.ts";
import type { Conversation } from "../lib/types.ts";
import type { RenderOptions } from "../lib/renderer.ts";

const elChatTitle = document.getElementById("chat-title") as HTMLSpanElement;
const elFrontmatter = document.getElementById("opt-frontmatter") as HTMLInputElement;
const elThinking = document.getElementById("opt-thinking") as HTMLInputElement;
const elToolInputs = document.getElementById("opt-tool-inputs") as HTMLInputElement;
const elToolResults = document.getElementById("opt-tool-results") as HTMLInputElement;
const elGenerate = document.getElementById("btn-generate") as HTMLButtonElement;
const elPreviewRegion = document.getElementById("preview-region") as HTMLDivElement;
const elPreviewTextarea = document.getElementById("preview-textarea") as HTMLTextAreaElement;
const elCopy = document.getElementById("btn-copy") as HTMLButtonElement;
const elDownload = document.getElementById("btn-download") as HTMLButtonElement;
const elToast = document.getElementById("toast") as HTMLDivElement;

let toastTimer: ReturnType<typeof setTimeout> | null = null;
// Filename derived during Generate; used by Download
let currentFilename = "export.md";

function showToast(text: string, kind: "info" | "error"): void {
  if (toastTimer !== null) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
  elToast.textContent = text;
  elToast.className = `toast ${kind}`;
  if (kind === "info") {
    toastTimer = setTimeout(() => {
      elToast.className = "toast hidden";
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
  elToast.className = "toast hidden";
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

async function init(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ?? "";
  const chatId = parseChatId(url);

  if (chatId === null) {
    elGenerate.disabled = true;
    showToast("Open a Claude conversation to export.", "error");
  }

  const settings = await loadSettings();
  elFrontmatter.checked = settings.includeFrontmatter;
  elThinking.checked = settings.includeThinking;
  elToolInputs.checked = settings.includeToolInputs;
  elToolResults.checked = settings.includeToolResults;

  elGenerate.addEventListener("click", () => {
    if (chatId === null) return;
    void handleGenerate(chatId);
  });

  elCopy.addEventListener("click", () => {
    void handleCopy();
  });

  elDownload.addEventListener("click", () => {
    handleDownload();
  });
}

async function handleGenerate(chatId: string): Promise<void> {
  hideToast();
  elGenerate.disabled = true;

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

    const conv = response.conversation as Conversation;
    const opts: RenderOptions = {
      includeFrontmatter: settings.includeFrontmatter,
      includeThinking: settings.includeThinking,
      includeToolInputs: settings.includeToolInputs,
      includeToolResults: settings.includeToolResults,
      exportedAt: new Date().toISOString(),
    };

    if (conv.name) {
      elChatTitle.textContent = conv.name;
      elChatTitle.title = conv.name;
    }

    const markdown = render(conv, opts);
    currentFilename = buildFilename(conv);

    elPreviewTextarea.value = markdown;
    elPreviewRegion.classList.remove("hidden");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Markhive generate failed:", err);
    showToast(`Couldn't render conversation: ${message}`, "error");
  } finally {
    elGenerate.disabled = false;
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

function handleDownload(): void {
  // Read from textarea so any user edits are honored
  const text = elPreviewTextarea.value;
  const blob = new Blob([text], { type: "text/markdown" });
  const blobUrl = URL.createObjectURL(blob);

  chrome.downloads.download({ url: blobUrl, filename: currentFilename, saveAs: false }, (downloadId) => {
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
