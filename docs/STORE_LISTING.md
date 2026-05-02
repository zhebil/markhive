# Chrome Web Store listing copy

Paste-ready text for the Chrome Web Store developer console submission.

---

## Item name (max 45 chars)

```
Markhive - Export Claude chats to Markdown
```

(43 chars)

## Short description (max 132 chars)

```
Export the open Claude.ai conversation to a Markdown file. Local only, no servers, no telemetry. Pick what to include.
```

(118 chars)

## Detailed description

```
Markhive is a tiny, local-only exporter for Claude.ai conversations.

Click the toolbar icon while viewing any chat at claude.ai, choose what to include, and Markhive writes a clean Markdown file straight to your Downloads folder - or to a folder of your choosing (e.g. an Obsidian vault) via the browser's File System Access API.

What you get
- Frontmatter with title, chat URL, model, and timestamps
- Optional inclusion of extended thinking blocks
- Optional inclusion of tool inputs and tool results
- A preview pane so you can copy or download
- Filename like 2026-05-02-untitled.md

How it works
Markhive reads the conversation that the Claude web app already loaded into your browser. It prefers the in-page IndexedDB cache (no extra network call), and only falls back to the public Claude API endpoints when the cache is empty - using the session cookie your browser already has. No data ever leaves your machine. There are no Markhive servers, no analytics, no telemetry, no third-party SDKs.

Permissions, in plain English
- activeTab + scripting: read the conversation from the claude.ai tab you have open
- downloads: save the .md file
- storage: remember your toggle preferences
- Host permission for claude.ai only

What it is not
- Not a Claude client. You still chat in claude.ai.
- Not a bulk exporter. One conversation at a time.
- Not for ChatGPT, Gemini, or other chatbots.

Open source. Issues and source: https://github.com/zhebil/markhive
```

## Category

`Productivity`

## Language

`English`

---

## Single-purpose statement

```
Markhive exports the currently open Claude.ai conversation to a Markdown file on the user's own machine. That is its only function.
```

## Permission justifications

### `activeTab`

```
Used to read the conversation data that the Claude.ai web app has already loaded into the active tab when the user clicks the Markhive toolbar icon. Activated only by that explicit click and scoped to the current tab.
```

### `scripting`

```
Used to inject a small content script into the active claude.ai tab to read the page's IndexedDB cache, which holds the same conversation data the Claude UI is rendering. Reading from the cache lets Markhive include tool-call details that the public REST endpoint strips. The script runs only on the active tab after a user click.
```

### `storage`

```
Used to persist the user's four export toggle preferences (include frontmatter, thinking, tool inputs, tool results) and an optional reference to a user-chosen save folder. Stored locally via chrome.storage; never transmitted.
```

### `downloads`

```
Used to save the rendered Markdown file to the user's Downloads folder when they click the Download button. The extension never initiates downloads without an explicit user action.
```

### Host permission `https://claude.ai/*`

```
Required so the extension can read the conversation from the active claude.ai tab and, as a fallback, call the public Claude.ai REST endpoints (/api/organizations and /api/organizations/<org>/chat_conversations/<id>) authenticated by the user's existing browser session. No other hosts are accessed.
```

### Remote code use

```
None. The extension bundles all its JavaScript. It does not load remote scripts, eval remote code, or fetch executable content at runtime.
```

### Data usage disclosure (developer console "Privacy practices")

Tick:
- [x] Personally identifiable information: NO
- [x] Health information: NO
- [x] Financial and payment information: NO
- [x] Authentication information: NO
- [x] Personal communications: YES - the conversation the user is exporting is, by nature, a personal communication. It is read on the user's machine and saved on the user's machine; it is never transmitted off-device by Markhive.
- [x] Location: NO
- [x] Web history: NO
- [x] User activity: NO
- [x] Website content: YES - the contents of the active claude.ai tab, in order to export it. Local-only.

Then check:
- [x] I do not sell or transfer user data to third parties for purposes unrelated to the item's single purpose
- [x] I do not use or transfer user data for purposes unrelated to the item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

Privacy policy URL: pending. Before submitting, make the repo public and use:

```
https://github.com/zhebil/markhive/blob/main/PRIVACY.md
```

(Or, if you want to keep the repo private, run `gh gist create PRIVACY.md --public --desc "Markhive privacy policy"` and use the gist URL.)

---

## Store assets checklist

- [ ] Store icon: 128 x 128 PNG (use `icons/128.png`)
- [ ] At least 1 screenshot, max 5: 1280 x 800 PNG or JPEG. Suggested set:
  1. Empty / non-chat URL state (light)
  2. Ready state with frontmatter on (light)
  3. Preview shown after Generate (light)
  4. Toast info "Saved to ..." (dark)
  5. Custom save folder picked (light)
- [ ] Optional small promo tile: 440 x 280 PNG or JPEG
- [ ] Optional marquee tile: 1400 x 560 PNG or JPEG (only needed if you want featured placement)

Take screenshots from a real Chrome window, not the design canvas. Crop to the popup region and pad to 1280 x 800 with a neutral background (the design tokens `--paper` / `--paper-2` work well).
