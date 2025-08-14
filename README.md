# Gmail Label Manager

A Chrome extension that enhances Gmail's label management capabilities with custom naming, reordering.

## Features

### 🏷️ Label Customization
- **Custom Display Names**: Rename Gmail labels without changing their internal names
- **System Label Protection**: System labels (Inbox, Sent, Drafts, etc.) are locked and cannot be modified
- **Real-time Updates**: Changes apply immediately to Gmail's sidebar

### 🔄 Label Reordering
- **Drag & Drop**: Reorder user labels in Gmail's sidebar using intuitive drag and drop
- **Persistent Order**: Custom label order is saved and restored across sessions
- **Smart Sorting**: Only user labels can be reordered; system labels maintain their fixed positions

### ⚙️ Configuration Management
- **Options Page**: Access advanced settings and label management through the extension options
- **Quick Settings**: Toggle features on/off directly from the popup menu
- **Reset to Defaults**: Easily restore all settings and label configurations to their original state

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the project folder
5. The extension icon will appear in your Chrome toolbar

## Configuration

### Architecture
- **Manifest V3**: Built using the latest Chrome extension manifest version
- **Content Scripts**: Injected into Gmail pages to modify the interface
- **Background Service Worker**: Handles configuration storage and management
- **Options Page**: Provides a comprehensive settings interface

### Permissions
- `storage`: Saves user preferences and label configurations
- `activeTab`: Accesses the current Gmail tab for modifications
- `tabs`: Manages Gmail tabs and refreshes pages when needed
- `scripting`: Injects content scripts into Gmail pages

### Host Permissions
- `https://mail.google.com/*`: Required to modify Gmail's interface

## File Structure

```
GmailLabel_Mod/
├── manifest.json          # Extension configuration
├── background.js          # Background service worker
├── content.js            # Content script for Gmail pages
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── options.html          # Options page interface
├── options.js            # Options page functionality
├── styles.css            # Shared styles
└── README.md             # This file
```

## License

This project is open source and available under the MIT License.

---

**Note**: This extension modifies Gmail's interface and may be affected by Gmail updates. If you encounter issues after a Gmail update, please report them so the extension can be updated accordingly.
