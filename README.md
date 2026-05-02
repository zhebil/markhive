# Markhive

A minimalistic Chrome extension that exports the open `claude.ai` conversation to a local Markdown file. No backend, no telemetry, no third-party storage.

## What it is

Markhive = "markdown" + "archive". Click the toolbar icon while viewing a Claude chat, choose what to include, and a `.md` file lands in your downloads folder. The only network calls are to `claude.ai` itself, authorized by your existing browser session.

## Install (load unpacked)

Markhive is not on the Chrome Web Store yet. Load it from source:

1. Clone or download this repository.
2. Run `npm install && npm run build`. The compiled extension appears in `dist/`.
3. Open `chrome://extensions` in Chrome.
4. Enable **Developer mode** (top-right toggle).
5. Click **Load unpacked** and select the `dist/` folder.
6. The Markhive icon (yellow M) appears in the toolbar.

## Usage

1. Open `https://claude.ai/chat/<any-conversation>`.
2. Click the Markhive toolbar icon.
3. The popup shows the chat title and four toggle checkboxes.
4. Adjust toggles as needed, then click **Export**.
5. Your browser downloads `<YYYY-MM-DD>-<slugified-title>.md`.

## Settings explained

| Toggle | Default | What it does |
|---|---|---|
| Include frontmatter | On | Adds a YAML block at the top with title, chat ID, URL, model, and timestamps. |
| Include thinking | Off | Renders extended thinking blocks as blockquotes labeled `**Thinking**`. |
| Include tool inputs | Off | Renders tool-call inputs as fenced JSON blockquotes when present. See limitations below. |
| Include tool results | Off | Renders tool results as fenced blockquotes when present. See limitations below. |

Settings are saved per browser profile via `chrome.storage.local` and restored on the next popup open.

## Privacy

Everything stays local. Markhive makes exactly two network calls, both to `claude.ai`:

1. `GET /api/organizations` - to discover your org ID.
2. `GET /api/organizations/<org>/chat_conversations/<chat>?tree=True&rendering_mode=messages` - to fetch the conversation.

Both calls use your existing session cookie. No data leaves your machine to any other destination. There is no analytics, no error reporting, no remote config.

## Limitations

- **Tool calls are not exported.** The `claude.ai` REST endpoint we use substitutes `tool_use`/`tool_result` blocks with a placeholder text on the server side; the structured tool data is only available over the live streaming channel. Markhive suppresses the placeholder so exports stay clean, but tool calls (e.g. web_search) will not appear in the markdown. Toggling "Include tool inputs/results" has no effect on conversations until this is solved (see roadmap).
- **Single conversation per export** - bulk export is not supported in v1.
- **Single org** - if your account has multiple orgs, v1 always picks the first one returned. If the conversation belongs to a different org, you will see an API error.
- **Markdown only** - no HTML output in v1.
- **No artifact side-car files** - artifacts are inlined as fenced code blocks in the `.md` file; they are not written as separate files.
- **No attachment downloads** - uploaded files appear as `[attachment: filename]` placeholders.
- **claude.ai only** - ChatGPT, Gemini, and other chatbots are not supported.

## Roadmap

Planned for future versions (not v1):

- Claude Code / `claude.com/code` surface support.
- Bulk export of all conversations.
- HTML output.
- In-page injected "Export" button next to the share button.
- Side-car artifact files and downloaded attachments.
- Adapters for other chatbots (ChatGPT, Gemini).
- Org picker UI for multi-org accounts.
- Page-context fetch fallback (content script) if direct API calls are ever blocked.

## Manual test checklist

Run through these scenarios after each build to verify end-to-end behavior:

- [ ] Short text-only conversation, default toggles - confirm frontmatter and headings are present, file downloads with a correct date-slug name.
- [ ] Long conversation with thinking blocks and tool calls, all toggles on - confirm thinking blockquotes and tool-call/result blocks appear.
- [ ] Conversation containing an artifact - confirm it renders as an H3 heading followed by a fenced code block with the correct language.
- [ ] Click the extension while logged out of Claude - confirm a clear toast appears: "You're signed out of Claude. Sign in and retry."
- [ ] Click the extension on a non-chat tab (e.g. `chrome://newtab`) - confirm the Export button is disabled and the toast reads "Open a Claude conversation to export."

## License

MIT License. Copyright 2026 Yevhenii Bilyk.
