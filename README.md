# Gmail Multi-Label Picker

A Chrome Extension (Manifest V3) that enhances Gmail with a powerful multi-label selection interface. Rename, reorder, and hide labels in your custom UI without affecting Gmail's native labels.

## ✨ Features

- **Multi-Label Selection**: Select multiple labels and search with AND/OR logic
- **Custom Display Names**: Rename labels for display without changing Gmail
- **Custom Ordering**: Drag & drop to reorder labels
- **Hide Labels**: Hide labels you don't need
- **Search Filtering**: Quickly find labels with search
- **Multi-Account Support**: Works with multiple Gmail accounts (u/0, u/1, etc.)
- **Privacy First**: Read-only Gmail API access, no data collection

## 🚀 Quick Start

### 1. Get OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Gmail API**
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
5. Application type: **Chrome Extension**
6. Copy the **Client ID**

### 2. Install Extension

1. Clone or download this repository
2. Open `manifest.json` and replace `YOUR_CLIENT_ID` with your OAuth Client ID:
   ```json
   "client_id": "YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com"
   ```
3. Open Chrome → **Extensions** → Enable **Developer mode**
4. Click **Load unpacked** → Select the extension folder
5. The extension will open the options page automatically

### 3. Authorize

1. Click **Authorize** on the options page
2. Grant permission to read Gmail labels
3. Your labels will load automatically

## 📖 Usage

### In Gmail:
- Look for the **📧 多选标签搜索** panel in the top-right corner
- Check labels to select them
- Toggle **AND/OR** mode for search logic
- Click **Search** to execute

### In Options:
- **Rename**: Enter custom display names
- **Reorder**: Drag rows to reorder
- **Hide**: Check the hide checkbox
- Click **Save** when done

## 🔧 Configuration

Settings are stored in `chrome.storage.sync` and include:

- `displayNameMap`: `{ "Real Name": "Display Name" }`
- `order`: `["Label1", "Label2", ...]`
- `hidden`: `["LabelToHide", ...]`

## 🛠️ Development

### File Structure
```
GLabel_Mod/
├── manifest.json       # Extension manifest (MV3)
├── sw.js              # Service worker (OAuth & API)
├── content.js         # Content script (UI injection)
├── options.html       # Options page
├── options.js         # Options page logic
├── popup.html         # Extension popup
├── popup.js           # Popup logic
└── README.md          # This file
```

### Key Technologies
- **Manifest V3**
- **Gmail REST API** (labels.readonly scope)
- **chrome.identity** for OAuth
- **chrome.storage.sync** for settings
- **Shadow DOM** for style isolation

## 🔒 Permissions

- `identity`: OAuth authentication
- `storage`: Save settings
- `scripting`: Inject UI
- `activeTab`: Detect current tab
- `https://mail.google.com/*`: Gmail access
- `https://www.googleapis.com/*`: Gmail API

## 🐛 Troubleshooting

**Labels not loading?**
- Check OAuth authorization
- Verify client ID in manifest.json
- Check console for errors

**UI not appearing?**
- Refresh Gmail page
- Check if extension is enabled
- Look for errors in DevTools console

**Settings not saving?**
- Check chrome.storage quota
- Verify sync is enabled in Chrome

## 📝 License

MIT License - Feel free to use and modify

## 🤝 Contributing

Issues and pull requests are welcome!

## 📮 Support

For bugs or feature requests, please open an issue on GitHub.

---

**Note**: This extension only reads Gmail labels (readonly scope). It does not modify emails or labels in Gmail itself.
