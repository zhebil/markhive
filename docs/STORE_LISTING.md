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
Markhive reads the conversation that the Claude web app already loaded into your browser. A small script injected into the active claude.ai tab pulls the conversation out of the page's IndexedDB cache and hands it to the popup. There are no Markhive servers, no API calls, no analytics, no third-party SDKs. The extension makes zero network requests of its own.

Permissions, in plain English
- activeTab + scripting: read the conversation from the claude.ai tab you have open, only when you click the toolbar icon
- downloads: save the .md file
- storage: remember your toggle preferences

That is the entire permission set. No host permissions, no cookies, no broad access. The amber dot in the popup means "I can read this tab"; the gray dot means "this is not a Claude chat."

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
Used to read the conversation data that the Claude.ai web app has already loaded into the active tab when the user clicks the Markhive toolbar icon. Activated only by that explicit click, scoped to the current tab, revoked when the tab is closed or navigates.
```

### `scripting`

```
Used to inject a small reader script into the active claude.ai tab. The script reads the page's IndexedDB cache (which holds the same conversation data the Claude UI is already rendering) and returns it to the popup. The script runs only on the active tab after a user click.
```

### `storage`

```
Used to persist the user's four export toggle preferences (include frontmatter, thinking, tool inputs, tool results) and an optional reference to a user-chosen save folder. Stored locally via chrome.storage; never transmitted. The most recent rendered Markdown is also cached in chrome.storage.session and cleared when the browser session ends.
```

### `downloads`

```
Used to save the rendered Markdown file to the user's Downloads folder when they click the Download button. The extension never initiates downloads without an explicit user action.
```

### Host permissions

```
None. The extension does not request any host permissions. Access to claude.ai is granted on user click via the activeTab permission, scoped to a single tab and a single invocation.
```

### Remote code use

```
None. The extension bundles all its JavaScript. It does not load remote scripts, eval remote code, or fetch executable content at runtime. It also makes no network requests of its own; the conversation is read from in-browser IndexedDB cache only.
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

---

## Store assets checklist

- [x] Store icon: 128 x 128 PNG (use `icons/128.png`)
- [x] Screenshots: 5 × 1280 x 800 PNG in `store-assets/` (`01-hero-preview-light.png` … `05-folder-picker.png`)
- [ ] Optional small promo tile: 440 x 280 PNG or JPEG
- [ ] Optional marquee tile: 1400 x 560 PNG or JPEG (only needed if you want featured placement)
