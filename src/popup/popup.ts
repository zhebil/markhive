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
const elExport = document.getElementById("btn-export") as HTMLButtonElement;
const elToast = document.getElementById("toast") as HTMLDivElement;

let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToastRaw(text: string, kind: "info" | "error"): void {
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
    elExport.disabled = true;
    showToastRaw("Open a Claude conversation to export.", "error");
  }

  const settings = await loadSettings();
  elFrontmatter.checked = settings.includeFrontmatter;
  elThinking.checked = settings.includeThinking;
  elToolInputs.checked = settings.includeToolInputs;
  elToolResults.checked = settings.includeToolResults;

  elExport.addEventListener("click", () => {
    if (chatId === null) return;
    void handleExport(chatId);
  });
}

async function handleExport(chatId: string): Promise<void> {
  hideToast();
  elExport.disabled = true;

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
    showToastRaw("Couldn't reach claude.ai. Check your connection.", "error");
    elExport.disabled = false;
    return;
  }

  if (!response.ok) {
    showToastRaw(mapErrorCode(response.error.code, response.error.status), "error");
    elExport.disabled = false;
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
  const filename = buildFilename(conv);

  const blob = new Blob([markdown], { type: "text/markdown" });
  const blobUrl = URL.createObjectURL(blob);

  chrome.downloads.download({ url: blobUrl, filename, saveAs: false });

  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

  showToastRaw("Exported successfully.", "info");
  elExport.disabled = false;
}

void init();
