# Repository Guidelines

## Project Structure & Module Organization
Core extension scripts sit at the root: `manifest.json` defines permissions, `sw.js` handles Gmail API auth, `content.js` renders the floating picker inside Gmail, and `options.js` powers the settings UI alongside `options.html`. Popup affordances live in `popup.html` and `popup.js`, while icons are stored under `icons/`. Documentation such as `README.md`, `SETUP_GUIDE.md`, and `CLAUDE.md` explain setup, OAuth flow, and architectural details—review these before modifying workflow-critical logic.

## Build, Test, and Development Commands
No bundler is used; edit the vanilla JS/HTML files directly. During development, reload the unpacked extension via `chrome://extensions/` → Developer Mode → `⌘R` (or the reload icon) after each change. To produce a distributable zip for the Chrome Web Store, run `bash -lc 'zip -r dist/gmail-multi-label-picker.zip manifest.json *.js *.html icons'` from the project root, ensuring credentials are excluded.

## Coding Style & Naming Conventions
Follow the existing two-space indentation, semicolon-terminated statements, and `const`/`let` usage. File-level comments summarize modules; inline comments should stay concise and bilingual where precedent exists. Keep DOM IDs and class names kebab-cased (e.g., `label-list`), and prefer descriptive verb-noun function names such as `loadConfig` or `renderPanel`. Avoid introducing build steps or external libraries without discussion.

## Testing Guidelines
Manual verification is the current standard. After reloading the extension, open Gmail and confirm the panel appears, label lists load, AND/OR toggles work, and searches open in the correct account tab. Validate options page flows: setting a new OAuth Client ID, renaming labels, hiding labels, and regrouping items. Use Chrome DevTools (Content Script tab and Service Worker console) to inspect runtime errors, and verify storage changes through `chrome.storage` inspection.

## Commit & Pull Request Guidelines
Match the repo history pattern of `<type>: <summary>` (`docs:`, `UI优化:`, `重构`) and keep subjects under ~72 characters. Commits should isolate logical changes and mention user-facing impacts in the body when needed. Pull requests must describe the problem, the solution, and manual test steps; link GitHub issues when applicable and include relevant screenshots or GIFs for UI updates.

## Security & Configuration Tips
Do not hardcode OAuth credentials; keep the client ID configurable via the options page and document any required scopes. When sharing debugging artifacts, redact tokens and Gmail account identifiers, and remind testers to revoke access from the settings panel after experiments.
