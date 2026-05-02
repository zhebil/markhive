# Markhive Privacy Policy

_Last updated: 2026-05-02_

Markhive is a Chrome extension that exports the open `claude.ai` conversation to a Markdown file on your own machine. It is local-only.

## What data Markhive accesses

- **The active claude.ai tab.** When you click the toolbar icon on a `https://claude.ai/chat/*` page, Markhive injects a small script into that tab via `chrome.scripting.executeScript`. The script reads the conversation data the Claude web app has already loaded into the page's IndexedDB cache and returns it to the popup. Nothing leaves the browser.
- **Your in-extension settings.** The four export toggles (frontmatter, thinking, tool inputs, tool results) and an optional save-folder reference are stored locally with `chrome.storage.local`. The most recent rendered Markdown is cached in `chrome.storage.session` (cleared when the browser session ends).

## What data Markhive sends

**Nothing leaves your machine.** Markhive has no servers, no analytics, no error reporting, no remote configuration, and no third-party SDKs. The extension makes no network requests of its own. Reading the conversation is an in-browser operation - the `executeScript` call reads data the Claude web app already cached in IndexedDB on the page.

## What data Markhive stores

- **Locally, in your browser**: the four toggle preferences, an optional File System Access folder handle (if you opted in via "Choose…"), and a session-scoped cache of the most recent rendered Markdown for the current chat (cleared when the browser session ends).
- **On disk, when you save**: the Markdown file you explicitly download or save via the folder picker. That is it.

## What Markhive never collects

- No personal information beyond the conversation you choose to export.
- No clickstream, page content from other sites, or telemetry.
- No identifiers, advertising IDs, or device fingerprints.
- No cookies or auth tokens. The extension does not request the `cookies` permission and does not read cookies from any tab.

## Permissions

| Permission | Why |
| --- | --- |
| `activeTab` | Read the conversation data in the active claude.ai tab when you click the toolbar icon. Permission is scoped to that tab, granted only for the user-initiated invocation, and revoked when the tab is closed or navigates. |
| `scripting` | Inject the small reader script into the active claude.ai tab so it can pull the conversation out of the page's IndexedDB cache. |
| `downloads` | Save the rendered Markdown file to your Downloads folder when you click Download. |
| `storage` | Persist your toggle preferences and the optional save-folder reference locally. |

Markhive does **not** request any of: `cookies`, `tabs`, `webRequest`, `history`, `notifications`, broad host permissions like `https://claude.ai/*` or `<all_urls>`. It runs only on the tab you are currently on, only after you click its icon.

## Children

Markhive is a developer-oriented tool aimed at adult users of `claude.ai`. It is not directed at children under 13.

## Changes

If a future version of Markhive ever changes how data is handled, this file will be updated and the version note above will reflect the change.

## Contact

Source code, issue tracker, and contact: https://github.com/zhebil/markhive
