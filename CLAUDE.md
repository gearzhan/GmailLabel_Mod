# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome Extension (Manifest V3) that adds a multi-label picker panel to Gmail's interface. It allows users to search emails by selecting multiple labels with AND/OR logic, customize label display names, organize labels into custom groups, and hide unwanted labels.

## Architecture

### Core Components

**Service Worker (`sw.js`)**
- Handles OAuth 2.0 authentication flow using chrome.identity API
- Manages access token storage and expiration detection
- Calls Gmail REST API to fetch label list
- Message types:
  - `GET_LABELS`: Fetch all Gmail labels
  - `REVOKE_AUTH`: Revoke authentication and clear tokens
  - `GET_AUTH_STATUS`: Check current authentication status
  - `GET_CLIENT_ID`: Get stored OAuth Client ID

**Content Script (`content.js`)**
- Injects floating panel at bottom-left of Gmail page using Shadow DOM for style isolation
- Implements multi-label selection and filtering
- Supports AND/OR search mode toggling
- Builds and executes Gmail search queries using label: syntax
- Manages panel expand/collapse state
- State management:
  - `STATE.selected`: Set of selected labels
  - `STATE.mode`: Search mode (AND/OR)
  - `STATE.groups`: Custom group configuration
  - `STATE.collapsedGroups`: Collapsed group IDs
  - `STATE.hidden`: Set of hidden labels

**Options Page (`options.html/js`)**
- OAuth Client ID configuration and storage
- Label renaming (only affects extension display, doesn't modify Gmail)
- Custom group management (System, custom groups, Ungrouped)
- Label hide control
- Real-time search and filter labels

**Popup (`popup.html/js`)**
- Simple shortcuts: Open Gmail and settings page

### Data Storage

Uses `chrome.storage.sync` for configuration:
- `clientId`: OAuth Client ID
- `displayNameMap`: Label display name mapping { realName: displayName }
- `order`: Label ordering (reserved)
- `hidden`: Array of hidden labels
- `groups`: Group definitions { groupId: { name: string } }
- `labelGroups`: Label to group mapping { labelId: groupId }
- `collapsedGroups`: Array of collapsed group IDs

Uses `chrome.storage.local` for temporary data:
- `accessToken`: Gmail API access token
- `tokenExpiry`: Token expiration timestamp

### Label Search Encoding

Label names must be properly encoded for Gmail search syntax:
- Labels with spaces/quotes/slashes: `label:"Label Name"`
- Simple labels: `label:LabelName`
- AND mode: `label:A label:B`
- OR mode: `label:A OR label:B`

### Gmail Multi-Account Support

Extracts account index from URL: `/u/0/`, `/u/1/` etc., ensuring search executes in the correct account.

## Development

### Setup

1. Create Google Cloud Project and enable Gmail API
2. Create OAuth 2.0 Client ID (application type: Chrome Extension)
3. Load unpacked extension in Chrome (`chrome://extensions/`)
4. Configure OAuth Client ID in extension settings page
5. Authorize Gmail label access on first use

### Testing

1. After loading extension, open Gmail
2. Check if panel appears at bottom-left of page
3. Test label selection, AND/OR toggle, search functionality
4. Test label renaming, grouping, hiding in settings page
5. Test multi-account support (switch between Gmail accounts)

### Key Implementation Details

- **Shadow DOM**: Panel uses Shadow DOM to isolate styles and avoid conflicts with Gmail
- **Gmail Load Detection**: Polls for `div[role="main"]` to ensure Gmail fully loads before injecting panel
- **Token Management**: Access token auto-detects expiration, clears on 401 error and prompts re-authorization
- **State Persistence**: Group expand state, hidden labels etc. sync to chrome.storage in real-time
- **Group Logic**:
  - System labels automatically go to System group
  - Ungrouped labels show in Ungrouped
  - Empty groups or groups with all labels hidden are automatically hidden

## Common Issues

- **Authentication failure**: Check Client ID format is correct (must include `.apps.googleusercontent.com`)
- **Panel not showing**: Confirm on Gmail page and fully loaded, check console errors
- **Label load failure**: Check OAuth authorization status, may need re-authorization
- **Search not working**: Check at least one label selected, confirm account index is correct
