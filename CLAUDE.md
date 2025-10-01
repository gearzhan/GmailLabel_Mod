# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gmail Multi-Label Picker is a **Chrome Extension (Manifest V3)** that provides a custom multi-select label interface for Gmail. Users can rename, reorder, and hide labels in the extension UI without modifying Gmail's native labels. The extension converts multi-label selections into Gmail search queries.

## Setup & Installation

### Initial Setup
1. **Get OAuth credentials from Google Cloud Console:**
   - Create project and enable Gmail API
   - Create OAuth 2.0 Client ID (type: Chrome Extension)
   - Copy the Client ID

2. **Configure the extension:**
   - Edit `manifest.json` line 12, replace `YOUR_CLIENT_ID` with actual OAuth Client ID
   - Format: `"client_id": "123456789-abcdef.apps.googleusercontent.com"`

3. **Load extension in Chrome:**
   - Chrome → Extensions → Enable Developer mode
   - Click "Load unpacked" → Select project directory
   - Extension will auto-open options page for authorization

### Testing
- Load the extension and navigate to `https://mail.google.com`
- The multi-label picker panel should appear in the top-right corner
- Test authorization flow via options page
- Test label selection, search, and customization features

## Architecture

### Message Passing Architecture
This extension uses Chrome's message passing to communicate between isolated contexts:

```
Content Script (content.js) → Service Worker (sw.js) → Gmail API
         ↓                              ↓
   Shadow DOM UI              OAuth Token Management
         ↓                              ↓
  chrome.storage.sync  ←────────  Options Page (options.js)
```

**Key message types:**
- `GET_LABELS`: Fetch all Gmail labels via API
- `GET_AUTH_STATUS`: Check OAuth authentication status
- `REVOKE_AUTH`: Revoke OAuth token

### Storage Schema
All settings stored in `chrome.storage.sync`:

```javascript
{
  displayNameMap: { "Real Label": "Display Name", ... },
  order: ["LabelName1", "LabelName2", ...],  // Custom sort order
  hidden: ["HiddenLabel1", ...]               // Hidden labels array
}
```

**Important:** Storage keys are based on **real label names** (not display names). The `displayNameMap` only affects UI rendering.

### Gmail Search Query Generation
The extension converts selected labels into Gmail search syntax:

- **AND mode:** `label:"A" label:"B"` (intersection)
- **OR mode:** `label:"A" OR label:"B"` (union)
- **Special characters:** Labels with spaces/slashes are wrapped in quotes and escaped
- **Navigation:** Constructs URL: `https://mail.google.com/mail/u/{account}/#search/{query}`

Key functions:
- `encodeLabel()` in content.js:21 - Handles special character escaping
- `buildQuery()` in content.js:30 - Constructs final search string
- `getAccountIndex()` in content.js:42 - Extracts account from URL (u/0, u/1, etc.)

### UI Injection Strategy
`content.js` waits for Gmail's SPA to load before injecting UI:

1. `waitForGmailReady()` polls for `div[role="main"]` or `[data-app="Gmail"]`
2. Once detected, injects fixed-position panel via `injectPanel()`
3. Uses **Shadow DOM** (`attachShadow`) to isolate styles from Gmail's CSS
4. Panel is positioned at `top: 80px, right: 16px` to avoid Gmail header

### OAuth Flow
Service worker (`sw.js`) manages authentication:

1. `getAuthToken()` - Requests token via `chrome.identity`
2. Token cached by Chrome until revoked
3. Scope: `gmail.labels.readonly` (read-only access)
4. On first install, opens options page for authorization

## Code Style & Conventions

- **UI Components:** English for user-facing text (following global CLAUDE.md)
- **Code Comments:** Chinese for inline comments (following global CLAUDE.md)
- **Function Comments:** Chinese, function-level documentation
- **Naming:** camelCase for functions/variables, PascalCase for constants/classes

## Common Modifications

### Adding New Label Operations
To add label modification capabilities (e.g., auto-apply labels):
1. Update OAuth scope in `manifest.json` to `gmail.modify`
2. Add new message types in `sw.js` for Gmail API operations
3. Implement handlers in service worker's `onMessage` listener

### Changing UI Position
Edit `content.js` line 66-73 to adjust panel position:
```javascript
host.style.cssText = `
  position: fixed;
  top: 80px;      // Adjust vertical position
  right: 16px;    // Adjust horizontal position
  width: 340px;   // Adjust width
  z-index: 9999;
  ...
`;
```

### Modifying Storage Quota
`chrome.storage.sync` has quota limits:
- Max 100KB total
- Max 8KB per item
- Max 512 items

If hitting limits, consider switching to `chrome.storage.local` (no sync, unlimited quota).

## Troubleshooting

**Panel not appearing:**
- Check console for `waitForGmailReady()` timeout (30s limit)
- Gmail's DOM structure may have changed - update selectors in content.js:418

**OAuth failures:**
- Verify Client ID format in manifest.json
- Check Gmail API is enabled in Google Cloud Console
- Clear cached token: options page → "撤销授权"

**Labels not loading:**
- Check network tab for Gmail API calls
- Verify OAuth token in service worker console
- API endpoint: `https://www.googleapis.com/gmail/v1/users/me/labels`

**Storage not persisting:**
- Check if Chrome sync is enabled
- Verify storage quota not exceeded
- Use DevTools → Application → Storage to inspect `chrome.storage.sync`
