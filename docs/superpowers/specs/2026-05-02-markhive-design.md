# Markhive - Design Spec

**Date:** 2026-05-02
**Status:** Approved (brainstorm complete, ready for implementation plan)

## 1. Summary

Markhive is a minimalistic Chrome extension that exports a Claude (`claude.ai`) conversation to a local Markdown file. No backend, no telemetry, no third-party storage. The user clicks the toolbar icon while viewing a chat, picks what to include (messages always; thinking, tool inputs, tool results, frontmatter optionally), and gets a `.md` file via `chrome.downloads`.

The architecture is deliberately decoupled so additional chatbots (ChatGPT, Gemini) and richer output (HTML, side-car artifact files) can be added without rewriting the core.

## 2. Goals and Non-Goals

### Goals (v1)
- Export the currently-open `claude.ai/chat/<uuid>` conversation to Markdown.
- Toggle inclusion of: thinking blocks, tool inputs, tool results, YAML frontmatter.
- Save toggle defaults across sessions (`chrome.storage.local`).
- Single self-contained `.md` file per export, named `<YYYY-MM-DD>-<slug(title)>.md`.
- Operate entirely client-side; the only network calls are to `claude.ai` itself, authorized by the user's existing browser session.
- Render unknown content-block types as inline HTML comments (`<!-- unsupported block: <type> -->`) instead of crashing.

### Non-Goals (v1, see Roadmap)
- HTML output.
- Bulk export of all conversations.
- Claude Code / `claude.com/code` surface.
- In-page injected "Export" button.
- Downloaded artifact side-car files or downloaded attachments.
- Other chatbots.
- Org picker for multi-org accounts (v1 picks the first org returned).

## 3. Naming

**Markhive** = "markdown" + "archive". The name is product-neutral (not Claude-specific), short, available, and describes what the tool actually does.

## 4. Trigger and UX

1. User is on `https://claude.ai/chat/<uuid>`.
2. User clicks the Markhive toolbar icon.
3. Popup opens showing:
   - Chat title (read by parsing the active tab) - read-only label.
   - Checkboxes (state pre-loaded from `chrome.storage.local`):
     - Include frontmatter (default on)
     - Include thinking (default off)
     - Include tool inputs (default off)
     - Include tool results (default off)
   - "Export" button.
4. User clicks Export. Popup updates settings, sends `{ chatId, options }` to the service worker, awaits the conversation JSON, runs the renderer, triggers `chrome.downloads.download(...)`.
5. On error, the popup surfaces a single-line toast (see error matrix in section 9).

## 5. Data Acquisition

The extension calls Claude's internal API directly from the service worker, using the user's existing session cookie. Mechanics:

- `host_permissions: ["https://claude.ai/*"]` allows the service worker to fetch the API. CORS does not apply to extension fetches against declared hosts. The browser attaches the session cookie automatically.
- Two calls:
  1. `GET https://claude.ai/api/organizations` -> pick the first org's `uuid`.
  2. `GET https://claude.ai/api/organizations/<orgId>/chat_conversations/<chatId>?tree=True&rendering_mode=messages` -> full conversation JSON in one response.
- Response is structured: `chat_messages[]`, each with a `content[]` of typed blocks (`text`, `thinking`, `tool_use`, `tool_result`, `image`, etc.). Pagination is not required; one call returns the full tree.

### Why the API rather than DOM scraping
- Stable, structured data including thinking and tool-use blocks (DOM doesn't reliably distinguish these).
- No virtualization workarounds.
- A single small file (`claude-api.ts`) isolates the only thing likely to change.

### Documented fallback (NOT built in v1)
If Anthropic ever blocks service-worker calls (e.g. via Cloudflare client-fingerprint checks), a content script can be injected into the open `claude.ai` tab and call the same endpoint via `window.fetch` from the page's own JS context, then post the result back via `chrome.runtime.sendMessage`. The page is already calling this API; the request is indistinguishable. This is ~30 extra lines and stays out of v1.

## 6. Output Format

### Markdown layout

```markdown
---
title: "<chat title>"
chat_id: <uuid>
url: https://claude.ai/chat/<uuid>
model: <model id>
created: <ISO 8601>
exported: <ISO 8601>
---

## User

<message text>

## Assistant

> **Thinking**
> <thinking text>

> **Tool call: <tool name>**
> ```json
> <tool input>
> ```

> **Tool result: <tool name>**
> ```
> <tool result text or JSON>
> ```

<assistant message text>
```

### Block-level rules

| Source content type | Markdown rendering |
|---|---|
| `text` | Inline; code fences passed through unmodified. |
| `thinking` | Blockquote with `**Thinking**` label; emitted only when `includeThinking`. |
| `tool_use` | Blockquote with `**Tool call: <name>**` label and a fenced ```json``` block of the input; emitted only when `includeToolInputs`. |
| `tool_result` | Blockquote with `**Tool result: <name>**` label and a fenced block (json if structured, plain otherwise); emitted only when `includeToolResults`. |
| Artifact (Claude code/document/HTML/SVG canvas) | Fenced code block, language hint from artifact metadata, preceded by an H3 with the artifact title. Always inline. |
| Attachment (uploaded file/image) | Placeholder `[attachment: <filename>]`. No download in v1. |
| Unknown block type | `<!-- unsupported block: <type> -->`. Never throws. |

Blockquotes were chosen over `<details>` collapsibles because they render universally in plain Markdown viewers, while `<details>` would appear as raw HTML tags in dumber renderers.

When a toggle is off, the corresponding block is omitted entirely - no empty headers or placeholder text.

### Filename
`<YYYY-MM-DD>-<slug(title)>.md`, where `slug` lowercases, transliterates, strips punctuation, and joins with hyphens. Date is the conversation's `created_at` (not the export time).

## 7. Architecture

### Components

```
[Popup]                                      [Service worker]
- popup.html                                  - service-worker.ts
- popup.ts        ─── chrome.runtime msg ──>  - claude-api.ts
- popup.css                                   ↑           |
                                              |           v
                                              |     fetch claude.ai/api/...
                                              |
- renderer.ts (called inline by popup)
- settings.ts (chrome.storage wrapper)
- slugify.ts
- url-parse.ts
```

### Module responsibilities

| Module | Owns | Knows nothing about |
|---|---|---|
| `popup.ts` | UI state, calling service worker, calling renderer, triggering download | Claude API shape, markdown formatting |
| `service-worker.ts` | Routing messages to `claude-api.ts` | UI, markdown |
| `claude-api.ts` | Claude URLs, org discovery, fetch + auth, error mapping | Markdown, UI |
| `renderer.ts` | Pure `(json, options) => string` markdown render | Network, UI, storage |
| `settings.ts` | `chrome.storage.local` get/set, defaults | Anything else |
| `slugify.ts` | Title -> filename slug | Anything else |
| `url-parse.ts` | `tab.url` -> `chatId` (or null) | Anything else |

The renderer's purity is the most important boundary: `renderer.ts` has no `chrome.*` imports and can be exercised entirely from fixture JSON in unit tests.

### Tech stack
- TypeScript, compiled by `tsc` to `dist/` (no bundler; zero runtime npm deps).
- Manifest V3, ES module service worker.
- Vanilla DOM in the popup. No framework.
- Tests: `node --test` against compiled JS, or via `tsx`/native type stripping for `.ts` test files.

### Build

A single `npm run build` script does two things:
1. `tsc` compiles `src/**/*.ts` to `dist/**/*.js`.
2. A short Node script copies static assets (`popup.html`, `popup.css`, `manifest.json`, `icons/`) into `dist/` so the unpacked extension lives entirely under `dist/`.

The user loads `dist/` as an unpacked extension in `chrome://extensions`. `npm run watch` runs `tsc --watch` plus a chokidar-based copy on the static files.

### File layout
```
markhive/
├── manifest.json
├── package.json
├── tsconfig.json
├── src/
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.ts
│   │   └── popup.css
│   ├── background/
│   │   └── service-worker.ts
│   └── lib/
│       ├── claude-api.ts
│       ├── renderer.ts
│       ├── slugify.ts
│       ├── settings.ts
│       └── url-parse.ts
├── dist/                       # gitignored, tsc output; manifest references this
├── test/
│   ├── fixtures/
│   │   ├── simple-text.json
│   │   ├── with-thinking.json
│   │   ├── with-tools.json
│   │   ├── with-artifacts.json
│   │   └── with-attachments.json
│   └── renderer.test.ts
├── icons/
│   ├── 16.png
│   ├── 48.png
│   └── 128.png
├── docs/superpowers/specs/
└── README.md
```

## 8. Manifest and permissions

```json
{
  "manifest_version": 3,
  "name": "Markhive",
  "version": "0.1.0",
  "description": "Export Claude conversations to Markdown.",
  "permissions": ["storage", "downloads", "activeTab"],
  "host_permissions": ["https://claude.ai/*"],
  "action": { "default_popup": "popup/popup.html" },
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "icons": {
    "16": "icons/16.png",
    "48": "icons/48.png",
    "128": "icons/128.png"
  }
}
```

Permission justifications:
- `storage` - persist toggle defaults.
- `downloads` - write the `.md` file via `chrome.downloads.download`.
- `activeTab` - read the current tab URL to derive `chatId`.
- `host_permissions: https://claude.ai/*` - service-worker fetch to the API; cookies attach automatically.

Explicitly NOT requested: `cookies` (we do not read cookies), `tabs` (`activeTab` is sufficient), no content scripts in v1.

## 9. Settings, errors, edge cases

### Settings shape
```ts
type Settings = {
  includeFrontmatter: boolean;     // default: true
  includeThinking: boolean;        // default: false
  includeToolInputs: boolean;      // default: false
  includeToolResults: boolean;     // default: false
  filenameTemplate: 'date-title';  // only valid value in v1
};
```

Defaults are written on first popup open if `chrome.storage.local` has no Markhive key. Subsequent exports overwrite the saved state with the user's current toggle selection.

### Error matrix

| Condition | Detection | User-facing message |
|---|---|---|
| Not on a Claude chat page | `url-parse.ts` returns null | "Open a Claude conversation to export." |
| Logged out | API 401 | "You're signed out of Claude. Sign in and retry." |
| Other API error | Status not 2xx | "Claude API error (NNN). The API may have changed - file an issue." |
| Network failure | fetch throws | "Couldn't reach claude.ai. Check your connection." |
| No org | empty `/organizations` | "No Claude org found on this account." |
| Unknown content block | renderer dispatch | (No toast.) Emit `<!-- unsupported block: <type> -->` and continue. |

Errors are surfaced as a one-line toast inside the popup. The popup never throws silently.

### Multi-org users
v1 picks the first org. If a user has more than one org and the conversation isn't in the first, the API returns 404 and the user sees the generic API-error toast. Roadmap: a small org picker when `organizations.length > 1`.

## 10. Testing

### Unit tests
- Target: `renderer.ts` only.
- Fixtures: real API responses captured manually, sanitized for personal content, checked into `test/fixtures/`. At least one fixture per content-block type (text, thinking, tool_use, tool_result, artifact, attachment) plus one with an unrecognized type.
- Cases:
  - Text-only conversation, default options.
  - Thinking included vs excluded.
  - Tool inputs included vs excluded.
  - Tool results included vs excluded.
  - Frontmatter on vs off.
  - Artifact rendered as fenced block with H3 title.
  - Attachment rendered as placeholder.
  - Unknown block type rendered as HTML comment.
  - Filename slugification (covered by `slugify.test.ts`).

### Manual verification checklist (in README)
- [ ] Short conversation, defaults.
- [ ] Long conversation with thinking and tool calls, all toggles on.
- [ ] Conversation containing an artifact.
- [ ] Conversation while logged out (expect a clear error toast).
- [ ] Click extension on a non-chat tab (expect "open a conversation" toast).

## 11. Roadmap (explicitly NOT v1)

- Claude Code / `claude.com/code` surface support.
- Bulk export of all conversations.
- HTML output (likely via a small markdown-to-HTML lib + a simple stylesheet).
- In-page injected "Export" button next to share.
- Side-car artifact files (each artifact written as its own file alongside the `.md`) and downloaded attachments (binary download or base64 inline).
- Adapters for other chatbots (ChatGPT, Gemini); each is `lib/<bot>-api.ts` producing a canonical `Conversation` type that the renderer already consumes.
- Org picker UI when an account has more than one org.
- Page-context fetch fallback (content script) if direct API calls ever get blocked.

## 12. Open questions

None remaining for v1. All decisions in this document were made during the brainstorming session.
