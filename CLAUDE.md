# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Chrome Extension (Manifest V3) that adds a **Material Design 3** multi-label picker panel to Gmail's interface. Features include:
- Multi-label selection with AND/OR search logic
- Dismissible chips showing selected labels
- Kanban board for label organization
- Custom label display names and grouping
- Drag-and-drop label management
- OAuth 2.0 authentication with Gmail API

## Architecture

### Core Components

**Service Worker (`sw.js`)**
- OAuth 2.0 authentication using `chrome.identity` API
- Gmail REST API integration for fetching labels
- Token management with expiration detection
- Message types:
  - `GET_LABELS`: Fetch all Gmail labels for an account
  - `REVOKE_AUTH`: Revoke authentication and clear stored tokens
  - `GET_AUTH_STATUS`: Check current authentication status
  - `GET_CLIENT_ID`: Retrieve stored OAuth Client ID

**Content Script (`content.js`)** - Material Design 3 UI
- Injects floating panel at bottom-left using Shadow DOM
- **FAB (Floating Action Button)**: 56px circular button with filter icon
- **Panel**: 320px width with MD3 elevation and rounded corners
- **Chips Container**: Dismissible chips for selected labels
- **Segmented Control**: ALL/ANY toggle using MD3 segmented buttons
- **Label List**: Pill-shaped items with color accents and grouping
- Multi-label selection with visual feedback
- AND/OR search mode toggling
- Gmail search query builder using `label:` syntax
- Draggable panel positioning (when collapsed)

**State Management (content.js)**
```javascript
STATE = {
  allLabels: [],           // Array of all Gmail labels
  selected: new Set(),     // Set of selected label names (real names)
  mode: 'AND',            // Search mode: 'AND' or 'OR'
  filterText: '',         // Current filter text
  groups: {},             // Custom groups { groupId: { name } }
  labelGroups: {},        // Label-to-group mapping { labelId: groupId }
  collapsedGroups: new Set(), // Collapsed group IDs
  panelCollapsed: true,   // Panel expand/collapse state
  panelPosition: { x: 12, y: 16 }, // Panel position (left, bottom)
  labelColorMap: {}       // Label colors { labelId: { backgroundColor, textColor } }
}
```

**Options Page (`options.html/js`)** - Kanban Board Layout
- **Horizontal Kanban board** with drag-and-drop between columns
- Column order: Ungrouped → System → Custom Groups
- OAuth Client ID configuration
- Label renaming (display name only, doesn't modify Gmail)
- Custom group management with create/rename/delete
- Label hiding (hidden labels don't appear in panel)
- Multi-select with floating toolbar
- Real-time search and filtering
- Configuration import/export (JSON format)

**Popup (`popup.html/js`)**
- Quick shortcuts to Gmail and settings page

### Material Design 3 Design System

**Design Tokens** (defined in both `content.js` and `options.html`)
```css
/* Color Tokens - Gmail-themed */
--md-sys-color-primary: #0b57d0;              /* Gmail blue */
--md-sys-color-primary-container: #d3e3fd;    /* Light blue */
--md-sys-color-secondary-container: #e8def8;  /* Purple for chips */
--md-sys-color-surface: #fdfcff;              /* White surface */
--md-sys-color-surface-container: #f0f4f9;    /* Gray container */

/* Elevation Shadows */
--md-elevation-1: 0px 1px 2px 0px rgba(0,0,0,0.3), 0px 1px 3px 1px rgba(0,0,0,0.15);
--md-elevation-3: 0px 4px 8px 3px rgba(0,0,0,0.15), 0px 1px 3px rgba(0,0,0,0.3);

/* Shape Tokens */
--md-sys-shape-corner-small: 8px;
--md-sys-shape-corner-medium: 12px;
--md-sys-shape-corner-large: 16px;
```

**Key UI Components**
- **FAB**: Circular (50% border-radius), 56px, uses primary container color
- **Chips**: 8px rounded corners, secondary container background, dismissible
- **Segmented Control**: 20px rounded pill container with 16px rounded buttons
- **Cards**: 12px rounded corners, elevation 1-3 for depth
- **Kanban Columns**: 300px fixed width, scrollable vertically, MD3 surface container

### Data Storage

**`chrome.storage.sync`** (synced across devices, max 100KB)
```javascript
{
  clientId: string,                    // OAuth Client ID
  displayNameMap: { [realName]: displayName }, // Custom label names
  order: { [groupId]: [labelId, ...] }, // Label order within groups
  hidden: string[],                    // Array of hidden label names
  groups: { [groupId]: { name } },     // Custom group definitions
  labelGroups: { [labelId]: groupId }, // Label-to-group mapping
  collapsedGroups: string[],           // Array of collapsed group IDs
  panelCollapsed: boolean,             // Panel expand/collapse state
  panelPosition: { x, y },             // Panel position (left, bottom margins)
  labelColorMap: { [labelId]: { backgroundColor, textColor } } // Label colors
}
```

**`chrome.storage.local`** (local only, for temporary data)
```javascript
{
  accessToken: string,     // Gmail API access token (per account)
  tokenExpiry: number      // Token expiration timestamp
}
```

### Label Search Encoding

Gmail search requires proper label encoding:
- Labels normalized: lowercase, spaces/slashes/& → hyphens
- Simple: `label:work`
- With spaces: `label:important-emails`
- AND mode: `label:work label:urgent`
- OR mode: `label:work OR label:personal`

**Encoding Logic** (`content.js:76-84`)
```javascript
function encodeLabel(labelName) {
  const normalized = labelName
    .toLowerCase()
    .replace(/[\s/&]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `label:${normalized}`;
}
```

### Multi-Account Support

Extracts account index from Gmail URL (`/u/0/`, `/u/1/`, etc.)
- Ensures search executes in correct account
- Token storage keyed by account (`u0`, `u1`)

## Development

### Setup

1. **Google Cloud Project**
   - Create project at https://console.cloud.google.com
   - Enable Gmail API
   - Create OAuth 2.0 Client ID (Chrome Extension type)
   - Note the Client ID (format: `xxx.apps.googleusercontent.com`)

2. **Load Extension**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select this directory

3. **Configure OAuth**
   - Click extension icon → Options
   - Paste OAuth Client ID
   - Click "Save"
   - Click "Authorize Now"

### Testing Checklist

**Gmail Panel**
- [ ] FAB appears at bottom-left (56px circular blue button)
- [ ] Click FAB expands panel (320px width)
- [ ] Select labels → chips appear at top
- [ ] Click × on chip → removes selection
- [ ] ALL/ANY toggle switches modes visually
- [ ] Filter input filters labels in real-time
- [ ] Search button navigates to Gmail search
- [ ] Panel remembers position after drag (when collapsed)
- [ ] Works across multiple Gmail accounts (`/u/0/`, `/u/1/`)

**Options Page (Kanban Board)**
- [ ] Horizontal scrolling board layout
- [ ] Three default columns: Ungrouped, System, Custom Groups
- [ ] Drag labels between columns → updates group assignment
- [ ] Drag within column → updates sort order
- [ ] Multi-select → floating toolbar appears at bottom
- [ ] Toolbar "Send to Group" moves selected labels
- [ ] Create custom group → new column appears
- [ ] Search filters labels across all columns
- [ ] Import/Export configuration works

**Edge Cases**
- [ ] Empty groups are hidden
- [ ] Hidden labels don't appear in panel
- [ ] Collapsed groups persist across sessions
- [ ] Token expiration triggers re-auth
- [ ] Panel works after Gmail SPA navigation

### Key Implementation Details

**Shadow DOM Isolation** (`content.js:349`)
- Prevents style conflicts with Gmail
- All MD3 styles scoped to `:host`
- Event listeners attached to shadow root elements

**Gmail Load Detection** (`content.js:835-854`)
- Polls for `div[role="main"]` before injecting panel
- Ensures Gmail fully loaded
- 30-second timeout fallback

**Token Management** (`sw.js`)
- Auto-detects expiration (401 errors)
- Clears tokens and prompts re-authorization
- Per-account token storage (`u0`, `u1`, etc.)

**State Persistence**
- Group expand/collapse saved on change
- Panel position saved after drag
- Label order saved after drop
- All state synced via `chrome.storage.sync`

**Drag-and-Drop Logic** (`options.js:499-546`)
- Visual feedback: primary container background on dragover
- Cross-column drag updates `labelGroups` mapping
- Drop to "Ungrouped" removes group assignment
- Re-renders after drop to show changes

**Chips Rendering** (`content.js:321-348`)
- Only shown when `STATE.selected.size > 0`
- Each chip has remove button (×)
- Fade-in animation on creation
- Container auto-hides when empty

## Common Issues & Solutions

### Authentication Failure
**Symptom**: "Failed to load labels" error
**Solutions**:
- Verify Client ID format includes `.apps.googleusercontent.com`
- Check OAuth consent screen is configured
- Ensure Gmail API is enabled in Google Cloud Console
- Try revoking and re-authorizing

### Panel Not Showing
**Symptom**: FAB doesn't appear in Gmail
**Solutions**:
- Confirm you're on `mail.google.com` page
- Wait for Gmail to fully load
- Check console for errors (F12)
- Reload page or extension
- Verify Shadow DOM is not blocked

### Label Load Failure
**Symptom**: "Loading labels..." never completes
**Solutions**:
- Check authorization status in options page
- Re-authorize if token expired
- Check network tab for 401/403 errors
- Verify account index extraction works

### Search Not Working
**Symptom**: Search button doesn't navigate
**Solutions**:
- Ensure at least one label is selected
- Check label encoding in console
- Verify account index is correct (`/u/0/` vs `/u/1/`)
- Test with simple label first

### Drag-and-Drop Issues
**Symptom**: Labels won't drag between columns
**Solutions**:
- Check if `draggable="true"` on cards
- Verify drop zone event listeners attached
- Look for console errors during drag
- Ensure `labelGroups` updates on drop

### Styles Not Applying
**Symptom**: Panel looks broken or unstyled
**Solutions**:
- Verify Shadow DOM is working
- Check MD3 design tokens are defined
- Clear browser cache and reload extension
- Check for CSS syntax errors in console

## Code Style & Patterns

### File Organization
- **content.js**: Panel UI and Gmail integration (~900 lines)
- **options.js**: Settings page logic (~830 lines)
- **options.html**: Settings page HTML/CSS (~700 lines)
- **sw.js**: Background service worker (~150 lines)

### Naming Conventions
- Functions: `camelCase` (e.g., `renderPanel`, `encodeLabel`)
- Constants: `UPPER_CASE` (e.g., `STATE`)
- CSS classes: `kebab-case` (e.g., `.label-item`, `.chip-remove`)
- MD3 tokens: `--md-sys-*` or `--md-ref-*`

### Comment Style
```javascript
// 中文注释用于函数功能说明
function renderPanel() {
  // 渲染chips（选中的标签）
  if ($chipsContainer) {
    // ...
  }
}
```

### Event Handling Pattern
```javascript
// Always use event delegation where possible
container.addEventListener('click', (e) => {
  if (e.target.matches('.label-item')) {
    // Handle click
  }
});

// For dynamic content, attach after creation
chip.querySelector('.chip-remove').addEventListener('click', (e) => {
  e.stopPropagation();
  // Handle remove
});
```

### State Updates
```javascript
// Always re-render after state change
STATE.selected.add(labelName);
renderPanel();

// Save to storage for persistence
STATE.panelCollapsed = !STATE.panelCollapsed;
chrome.storage.sync.set({ panelCollapsed: STATE.panelCollapsed });
```

## Material Design 3 Guidelines

When making UI changes, follow these MD3 principles:

1. **Use Design Tokens**: Never hardcode colors/sizes, use CSS variables
2. **Elevation**: Use predefined `--md-elevation-*` shadows
3. **Shape**: Use `--md-sys-shape-corner-*` for border radius
4. **Color Roles**: Use semantic tokens (`primary`, `surface`, `on-surface`)
5. **Typography**: Google Sans font family throughout
6. **Spacing**: 4px grid system (4, 8, 12, 16, 24px)
7. **Transitions**: Use `cubic-bezier(0.2, 0.0, 0, 1.0)` for standard easing
8. **Accessibility**: WCAG AA contrast ratios, keyboard navigation

## Performance Considerations

- **Lazy Rendering**: Only render visible labels (scrolling handled by browser)
- **Shadow DOM**: Isolates styles, prevents global CSS pollution
- **Debouncing**: Filter input has no debouncing (instant feedback)
- **Storage Quotas**: `chrome.storage.sync` limited to 100KB total
- **Token Caching**: Access tokens cached locally per account
- **Minimal Re-renders**: Only re-render on state change, not on timer

## Future Enhancement Ideas

- [ ] Dark mode support using MD3 dark color scheme
- [ ] Keyboard shortcuts (e.g., Ctrl+Shift+L to open panel)
- [ ] Label color picker in options page
- [ ] Bulk operations (hide multiple, rename multiple)
- [ ] Search history / saved searches
- [ ] Export search as Gmail filter
- [ ] Integration with Gmail filters API
- [ ] Offline mode with cached labels
- [ ] Statistics / analytics on label usage

## References

- [Material Design 3](https://m3.material.io/)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Identity API](https://developer.chrome.com/docs/extensions/reference/identity/)
- [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM)
