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
- **OAuth Scope** (as of v0.2.0): `https://www.googleapis.com/auth/gmail.modify`
  - **Capabilities**: Read labels, apply labels to messages
  - **Breaking Change**: Upgraded from `gmail.readonly` in v0.1.x
- Gmail REST API integration for fetching and modifying labels
- Token management with expiration detection and auto-recovery on 401 errors
- Label color extraction (backgroundColor, textColor) from Gmail API
- Per-account token storage with expiry timestamps
- Message types:
  - `GET_LABELS`: Fetch all Gmail labels for an account
  - `REVOKE_AUTH`: Revoke authentication and clear stored tokens
  - `GET_AUTH_STATUS`: Check current authentication status
  - `GET_CLIENT_ID`: Retrieve stored OAuth Client ID
  - `APPLY_LABEL`: Apply label to a single message (v0.2.0+)

**Content Script (`content.js`)** - Material Design 3 UI
- Injects floating panel at bottom-left using Shadow DOM
- **FAB (Floating Action Button)**: 56px circular button with filter icon
- **Panel**: 320px width with MD3 elevation and rounded corners
- **Chips Container**: Dismissible chips for selected labels
- **Segmented Control**: ALL/ANY toggle with animated sliding pill (cubic-bezier easing)
- **Label List**: Pill-shaped items with Gmail color visualization and grouping
- Multi-label selection with visual feedback
- AND/OR search mode toggling
- Gmail search query builder using `label:` syntax
- **Drag-and-Drop Label Application** (v0.2.0+): Drag labels onto Gmail email rows to apply them instantly
- **Toast Notifications** (v0.2.0+): MD3-styled snackbar for success/error feedback
- **Draggable Panel Positioning**: When collapsed, FAB becomes draggable with edge-snapping (12px margins)
- **Nested Label Support**: Labels with "/" display with indentation and visual hierarchy
- **Label Color Sync**: Displays Gmail label colors as left border accents (fallback: gray #9ca3af)

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
- **Sidebar Navigation**: Tab-based sections (General, Labels, Groups, Backup) with fade-in transitions
- OAuth Client ID configuration
- Label renaming (display name only, doesn't modify Gmail)
- Custom group management with create/rename/delete
- Label hiding (hidden labels don't appear in panel)
- **Multi-select Toolbar**: Floating toolbar appears when 1+ labels selected, enables bulk group assignment
- Real-time search and filtering across all columns
- **Configuration Import/Export**: JSON format with data validation (checks group reference integrity)

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

**`chrome.storage.local`** (local only, per-account tokens)
```javascript
{
  tokens: {
    u0: { accessToken: string, tokenExpiry: number },  // Account /u/0/
    u1: { accessToken: string, tokenExpiry: number },  // Account /u/1/
    // ... additional accounts as needed
  }
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
- [ ] ALL/ANY toggle switches modes with sliding pill animation
- [ ] Filter input filters labels in real-time
- [ ] Search button navigates to Gmail search
- [ ] Drag collapsed FAB → snaps to edges with 12px margin
- [ ] Nested labels (containing "/") display with indentation
- [ ] Label colors from Gmail API display as left border accents
- [ ] Panel remembers position after drag (when collapsed)
- [ ] Works across multiple Gmail accounts (`/u/0/`, `/u/1/`)

**Options Page (Kanban Board)**
- [ ] Horizontal scrolling board layout
- [ ] Three default columns: Ungrouped, System, Custom Groups
- [ ] Sidebar navigation switches between sections (General, Labels, Groups, Backup)
- [ ] Section transitions show fade-in animation (250ms)
- [ ] Drag labels between columns → updates group assignment
- [ ] Drag within column → updates sort order correctly
- [ ] Multi-select → floating toolbar appears at bottom when 1+ labels checked
- [ ] Toolbar "Send to Group" moves selected labels in bulk
- [ ] Group headers collapse/expand columns on click
- [ ] Create custom group → new column appears
- [ ] Search filters labels across all columns in real-time
- [ ] Import/Export configuration works with JSON format
- [ ] Import validates group references and removes invalid ones

**Edge Cases**
- [ ] Empty groups are hidden
- [ ] Hidden labels don't appear in panel
- [ ] Collapsed groups persist across sessions
- [ ] Token expiration triggers 401 error → auto-clears token → prompts re-auth
- [ ] Panel works after Gmail SPA navigation
- [ ] Data migration from old format works automatically on load

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

**Data Migration Logic** (`content.js:43-49`, `options.js:76-84`)
- Detects old array-based `order` format: `[labelId1, labelId2, ...]`
- Migrates to object format: `{ groupId: [labelId, ...] }`
- Logs console warning for debugging
- Automatic migration on config load
- Clears old format immediately after migration

**Drag-and-Drop with Snapping** (`content.js:825-967`)
- Collapsed FAB becomes draggable on mousedown
- **Intelligent drag detection**: Requires 300ms OR 5px movement to prevent accidental drags
- Edge-snapping algorithm:
  - Left edge: `Math.max(12, Math.min(x, window.innerWidth - 44))`
  - Bottom edge: `Math.max(12, Math.min(y, window.innerHeight - 44))`
  - 12px safety margin from window boundaries
- Smooth animation using `cubic-bezier(0.2, 0.0, 0, 1.0)` easing
- Position saved to `chrome.storage.sync` on drag end
- Mouse listeners attached to document for full-window tracking

**Label Color Extraction** (`sw.js:139-151`)
- Extracts `backgroundColor` and `textColor` from Gmail API `/users/me/labels` response
- Stores in `chrome.storage.sync.labelColorMap` with label ID as key
- Content script applies colors as left border on label items (`content.js:151-165`)
- Fallback to gray (#9ca3af) if color not available
- Colors persist across sessions and sync across devices

**Nested Label Rendering** (`content.js:257-263`)
- Detects nested labels via `label.name.includes('/')`
- Applies `.nested-label` CSS class
- Visual styling: 16px left padding, 2px left border, lighter background
- Preserves hierarchy without modifying Gmail label structure
- Works with Gmail's native nested label naming convention

**Multi-Select Toolbar** (`options.js:626-689`)
- Dynamically rendered when `selectedLabels.size > 0`
- Fixed position at bottom of viewport
- Shows count of selected labels
- "Send to Group" dropdown populated with all available groups
- "Cancel" button clears selection
- Bulk operations update `labelGroups` mapping for all selected labels
- Re-renders board after bulk assignment

**Configuration Import Validation** (`options.js:170-179`)
- Validates all `labelGroups` references point to valid group IDs
- Checks `labelGroups[labelId]` exists in `groups` object
- Silently removes invalid group references (sets to undefined)
- Console logs validation errors for debugging
- Ensures data consistency after import from potentially corrupted JSON

**requestAnimationFrame Pattern** (`options.js:535-545`)
- Double `requestAnimationFrame` after drag-and-drop
- First RAF: DOM updates complete
- Second RAF: Read updated order from DOM
- Ensures reliable order tracking after drag operations
- Prevents race conditions between DOM updates and reads

## Advanced Features

### Nested Label Support

Gmail supports nested labels using "/" separator (e.g., "Work/Projects/Important"). The extension automatically detects and visually represents this hierarchy:

- **Detection**: Checks if `label.name.includes('/')`
- **Visual Treatment**: 16px left padding, 2px colored left border
- **Non-Destructive**: Doesn't modify Gmail labels, only changes display
- **Filtering**: Nested labels remain searchable by full name or partial name

**Implementation**: See `content.js:257-263` for detection and rendering logic.

### Drag-and-Drop Label Application

Apply labels directly to Gmail messages by dragging from the panel:

- **Activation**: Labels are draggable by default (HTML5 `draggable="true"`)
- **Visual Feedback**: Label becomes semi-transparent (opacity 0.5) during drag
- **Drop Zones**: Any Gmail email row (`tr[role="row"]` or `div[role="row"]`)
- **Hover Effect**: Blue dashed outline appears on hover
- **Message ID Extraction**: Multi-layered fallback strategy (5 methods)
- **API Call**: Uses `/messages/{id}/modify` endpoint (applies to single message only)
- **Toast Notifications**: MD3-styled success/error messages at bottom-right
- **OAuth Scope**: Requires `gmail.modify` (upgraded from `gmail.readonly` in v0.2.0)

**Use Case**: Quickly triage and organize emails without navigating away or using Gmail's built-in label menu.

**Implementation**: See `content.js:initDragAndDrop()` for complete logic.

**Message ID Extraction Strategy**: 5-layer fallback system:
1. `input[name="t"]` checkbox value or data attributes (95%+ reliability)
2. `[data-message-id]` attribute on row or children (70% reliability)
3. Row's own `data-message-id` attribute (60% reliability)
4. Row `id` attribute with `msg-` prefix (40% reliability)
5. Parse from `href` in row links (30% reliability)

**Error Handling**: English error messages with toast notifications:
- "Authentication expired. Please re-authorize." (401 error)
- "Insufficient permissions. Please re-authorize in settings." (403 error)
- "Message not found." (404 error)
- "Could not identify message ID" (extraction failure)

### Draggable Panel with Smart Snapping

When collapsed, the FAB button becomes fully draggable with intelligent edge-snapping:

- **Drag Activation**: 300ms hold OR 5px movement prevents accidental drags on click
- **Window Constraints**: Snaps to edges with 12px safety margin
- **Smooth Animation**: `cubic-bezier(0.2, 0.0, 0, 1.0)` easing for polished feel
- **Persistence**: Position saved to `chrome.storage.sync`, restored on page load
- **Multi-Account**: Each Gmail account remembers its own panel position

**Use Case**: Position panel anywhere on screen to avoid blocking important UI elements.

**Implementation**: See `content.js:825-967` for complete drag logic.

### Label Color Synchronization

The extension extracts and displays Gmail's native label colors:

- **Source**: Gmail REST API `/users/me/labels` response includes color data
- **Storage**: Colors stored in `labelColorMap` and synced across devices
- **Display**: Applied as 3px left border on label items in panel
- **Fallback**: Gray (#9ca3af) for system labels or labels without colors
- **Performance**: Colors fetched once during label load, cached locally

**Visual Impact**: Helps users quickly identify labels by color, matching Gmail's native UI.

**Implementation**: Color extraction in `sw.js:139-151`, rendering in `content.js:151-165`.

### Multi-Select Toolbar for Bulk Operations

Options page includes powerful multi-select capabilities:

- **Activation**: Check 1+ labels → floating toolbar appears at bottom
- **Bulk Actions**: "Send to Group" moves all selected labels to target group
- **Visual Feedback**: Selected count displayed, checkboxes highlighted
- **Cancel**: Clear selection instantly with cancel button
- **Efficiency**: Manage dozens of labels with single operation

**Use Case**: Quickly organize newly imported labels or reorganize existing structure.

**Implementation**: See `options.js:626-689` for toolbar rendering and bulk operations.

### Automatic Data Migration

The extension handles format changes transparently:

- **Old Format**: Array-based order `[labelId1, labelId2, ...]`
- **New Format**: Object-based order `{ groupId: [labelId, ...] }`
- **Detection**: Checks if `order` is an Array
- **Migration**: Automatic conversion on first load after update
- **Logging**: Console warning documents migration for debugging
- **Cleanup**: Old format cleared after successful migration

**User Impact**: Seamless updates without manual intervention or data loss.

**Implementation**: See `content.js:43-49` and `options.js:76-84`.

### Configuration Validation on Import

Import feature includes robust validation to prevent corruption:

- **Group Reference Validation**: Ensures all `labelGroups[labelId]` point to valid group IDs
- **Orphan Cleanup**: Removes references to deleted or invalid groups
- **Non-Breaking**: Invalid data removed silently with console warnings
- **Idempotent**: Can re-import same config multiple times safely
- **Version Tracking**: Export includes version number for future compatibility

**Use Case**: Share configurations between devices or users without breaking existing setups.

**Implementation**: See `options.js:170-179` for validation logic.

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
- **content.js**: Panel UI and Gmail integration (~1,066 lines)
- **options.js**: Settings page logic (~876 lines)
- **options.html**: Settings page HTML/CSS (~1,001 lines)
- **sw.js**: Background service worker (~215 lines)

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
