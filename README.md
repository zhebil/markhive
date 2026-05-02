# Markhive

A small Chrome extension that exports the open `claude.ai` conversation to a local Markdown file. No backend, no telemetry, no third-party storage. Local-only.

## What it is

Markhive = "markdown" + "archive". Click the toolbar icon while viewing a Claude chat, choose what to include, and a `.md` file lands in your Downloads folder (or in any folder you pick via the system picker).

## Install

### From source (load unpacked)

1. Clone this repo.
2. `npm install && npm run build`. The compiled extension lands in `dist/`.
3. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select `dist/`.
4. The amber Markhive icon appears in the toolbar.

### From the Chrome Web Store

Listing pending review.

## Usage

1. Open any `https://claude.ai/chat/<id>` page and let it load.
2. Click the Markhive icon. The popup shows the chat title and four toggles.
3. Adjust toggles, then click **Generate markdown**.
4. Use **Copy** to put the Markdown on your clipboard or **Download** to save it as `<YYYY-MM-DD>-<slug>.md`. By default this saves to your browser's Downloads folder; click **Choose…** in the SAVE TO row to redirect to a folder of your choice (e.g. an Obsidian vault) via the File System Access API.

## Settings

| Toggle | Default | What it does |
|---|---|---|
| Include frontmatter | On | Adds a YAML block with title, chat id, URL, model, and timestamps. |
| Include thinking | Off | Renders extended thinking blocks as labelled blockquotes. |
| Include tool inputs | Off | Renders tool-call inputs as fenced JSON. |
| Include tool results | Off | Renders tool results as fenced blocks. |

Toggle preferences are saved per browser profile via `chrome.storage.local`. The most recent rendered Markdown is cached in `chrome.storage.session` so reopening the popup on the same chat shows the previous export instantly; that cache is dropped when the browser session ends.

## How it reads conversations

Markhive reads the conversation from the active claude.ai tab's IndexedDB cache, which the Claude web app populates as you use the chat. There is no separate API call: the data is already in your browser, and Markhive uses `chrome.scripting.executeScript` to read it from inside the page (`activeTab` only, on user click).

If the cache is empty for a given chat (e.g. you have not opened that chat in this browser), Markhive shows: *"No cached conversation. Open this chat in the tab so it loads, then click Regenerate."*

## Privacy

Everything stays local. There are no Markhive servers, no analytics, no error reporting, no remote configuration, no third-party SDKs. The extension does not request the `cookies` permission and does not read or store auth tokens.

See [`PRIVACY.md`](./PRIVACY.md) for the formal policy and per-permission justification.

## Limitations

- **One conversation at a time.** Bulk export is not supported.
- **Markdown only.**
- **Artifacts are inlined** as fenced code blocks; not written as separate files.
- **Attachments** appear as `[attachment: filename]` placeholders; their bytes are not downloaded.
- **`claude.ai` only.** ChatGPT, Gemini, and other chatbots are not supported.
- **Cache-only.** If the conversation has never been opened in the current browser, the IndexedDB cache will not have it and export will fail with the message above. Open the chat first.

## Development

```bash
npm install
npm run build      # tsc + copy assets into dist/
npm run watch      # rebuild on change
npm test           # 41 tests, no browser needed
npm run pack:store # build + zip dist/ into markhive-<version>.zip
```

Source layout:

```
src/
  background/        (none — popup talks to the page directly)
  popup/
    popup.html
    popup.css
    popup.ts         vanilla TS, no framework
  lib/
    idb-cache.ts     reads the page IndexedDB via executeScript
    fs-handle.ts     File System Access API wrapper
    renderer.ts      Conversation -> Markdown
    filename.ts      buildFilename(conv)
    slugify.ts       title -> slug
    settings.ts      chrome.storage.local prefs
    types.ts         Conversation / ContentBlock / ...
    url-parse.ts     parseChatId(url)
    fs-types.d.ts    File System Access typings
test/                node:test runner, fixtures in test/fixtures/
scripts/
  copy-assets.mjs    HTML/CSS/icons/manifest -> dist/
  pack.mjs           zip dist/ for Web Store
```

## Manual test checklist

Run after each meaningful change:

- [ ] Short text-only chat, default toggles - frontmatter + headings present, file saves with `<date>-<slug>.md`.
- [ ] Long chat with thinking and tool calls, all toggles on - thinking blockquotes and tool blocks render; fences are not broken by triple-backtick content.
- [ ] Chat containing an artifact - renders as an H3 followed by a fenced block in the correct language.
- [ ] Click on a non-chat tab (e.g. `chrome://newtab`) - Generate is disabled, status pill is IDLE, error toast explains why.
- [ ] Custom save folder via "Choose…" - first save lands in the picked folder; revoke permission via the browser's site settings, then save again - falls back to Downloads with a clear toast and the saved folder reference is cleared.

## License

MIT - see [`LICENSE`](./LICENSE). Copyright 2026 Yevhenii Bilyk.
