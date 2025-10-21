# Gmail Multi-Label Picker

A Chrome Extension that enhances Gmail's label management with multi-select filtering, custom grouping, and advanced organization features.

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![Manifest](https://img.shields.io/badge/manifest-v3-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

## Features

### 🏷️ Multi-Label Selection & Filtering
- **Multi-select interface**: Check multiple labels to filter emails
- **AND/OR search modes**: Find emails with ALL labels or ANY label
- **Quick search**: Built-in filter to locate specific labels
- **Multi-account support**: Works seamlessly across multiple Gmail accounts

### 📁 Custom Label Organization
- **Custom groups**: Create and manage label categories
- **Drag-free assignment**: Select labels and send them to groups with toolbar
- **Collapsible groups**: Click headers to expand/collapse label lists
- **Smart ordering**: Custom groups first, System and Ungrouped last

### ✨ Label Customization
- **Rename labels**: Change display names (doesn't affect Gmail)
- **Hide unwanted labels**: Keep your panel clean and focused
- **Type indicators**: Visual badges for System vs User labels
- **2-column group layout**: Efficient space utilization

### 🎨 Modern UI
- **Bottom-left floating panel**: Non-intrusive Gmail integration
- **Collapsible interface**: Toggle button for quick show/hide
- **Material Design**: Gmail-style aesthetics with smooth animations
- **Responsive grid**: Adapts to different screen sizes

## Installation & Setup

### Quick Start

1. **Clone or download this repository**
   ```bash
   git clone https://github.com/gearzhan/GmailLabel_Mod.git
   cd GmailLabel_Mod
   ```

2. **Load the extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (top-right toggle)
   - Click "Load unpacked"
   - Select the `GmailLabel_Mod` folder

3. **Configure OAuth Client ID**
   - Create a Google Cloud Project
   - Enable Gmail API
   - Create OAuth 2.0 credentials (Chrome Extension type)
   - Copy the Client ID and paste it in extension settings

📖 **For detailed setup instructions, see [SETUP_GUIDE.md](./SETUP_GUIDE.md)**

## Usage

### Basic Workflow

1. **Open Gmail** - Navigate to https://mail.google.com
2. **Click the blue toggle button** at bottom-left to open the panel
3. **Select labels** by checking boxes on label cards
4. **Choose target group** from the toolbar dropdown
5. **Click "Send to Group"** to organize labels
6. **Search emails** by selecting labels and clicking "Search"

### Settings Page

Access via extension icon → Settings (or right-click → Options):

- **OAuth Configuration**: Configure your Client ID
- **Group Management**: Create, rename, delete custom groups
- **Label Management**: Organize labels with multi-select and send-to-group
  - Select labels with checkboxes
  - Use toolbar to move labels between groups
  - Rename display names
  - Hide unwanted labels
  - Collapse groups to save space

### Keyboard Shortcuts

- **Enter**: Create new group in group management form
- **Click group header**: Toggle collapse/expand

## Architecture

### Core Components

- **Service Worker** (`sw.js`): OAuth 2.0 authentication, Gmail API calls
- **Content Script** (`content.js`): Injects panel into Gmail, handles UI interactions
- **Options Page** (`options.html/js`): Settings, label/group management
- **Popup** (`popup.html/js`): Quick shortcuts

### Technologies

- Chrome Extension Manifest V3
- Gmail REST API
- Shadow DOM (style isolation)
- Chrome Storage API (sync storage)
- Vanilla JavaScript (no frameworks)

### Data Storage

All data stored in `chrome.storage.sync`:
- `clientId`: OAuth Client ID
- `displayNameMap`: Label rename mappings
- `groups`: Custom group definitions
- `labelGroups`: Label-to-group assignments
- `hidden`: Hidden labels list
- `collapsedGroups`: Collapsed group states

## Privacy & Security

- ✅ **No data collection**: Extension does not collect or transmit any personal data
- ✅ **Local storage only**: All settings stored locally in Chrome
- ✅ **Read-only access**: Only reads labels and performs searches
- ✅ **OAuth 2.0**: Industry-standard authentication
- ✅ **Open source**: All code available for review

### OAuth Scopes

- `gmail.labels` - Read Gmail labels
- `gmail.readonly` - Read Gmail data (for search)

Both are **read-only scopes** - the extension cannot modify your emails or send messages.

## Development

### Project Structure

```
GmailLabel_Mod/
├── manifest.json       # Extension manifest (v3)
├── sw.js              # Service worker (background)
├── content.js         # Gmail page content script
├── options.html       # Settings page UI
├── options.js         # Settings page logic
├── popup.html         # Extension popup UI
├── popup.js           # Popup logic
├── SETUP_GUIDE.md     # Detailed setup instructions
├── CLAUDE.md          # Development documentation
└── README.md          # This file
```

### Key Implementation Details

- **Shadow DOM**: Panel uses Shadow DOM to avoid style conflicts
- **Gmail Load Detection**: Polls for `div[role="main"]` to ensure Gmail is ready
- **Token Management**: Auto-detects expiration, handles 401 errors
- **State Persistence**: Group collapse states sync to chrome.storage
- **Multi-account**: Extracts account index from URL (`/u/0/`, `/u/1/`)

### Building & Testing

1. Make changes to source files
2. Reload extension at `chrome://extensions/`
3. Test in Gmail at `https://mail.google.com`
4. Check console for errors (F12)

## Troubleshooting

### Common Issues

**Panel doesn't appear**
- Ensure you're on `mail.google.com`
- Reload Gmail page
- Check extension is enabled at `chrome://extensions/`

**Labels don't load**
- Verify Client ID is configured correctly
- Check Gmail API is enabled in Google Cloud Console
- Try revoking and re-authorizing in settings

**"401 Unauthorized" error**
- Access token expired - revoke and re-authorize
- Go to Settings → "Revoke Authorization"

For more troubleshooting, see [SETUP_GUIDE.md](./SETUP_GUIDE.md#troubleshooting)

## Contributing

Contributions are welcome! Please feel free to:
- Report bugs via GitHub Issues
- Suggest features
- Submit pull requests
- Improve documentation

## Changelog

### v0.1.0 (2025-10-21)
- ✨ Initial release
- 🎨 Multi-select + send-to-group interface
- 📁 Collapsible custom groups
- 🏷️ Label renaming and hiding
- 🔍 AND/OR search modes
- 🎯 Multi-account support

## License

MIT License

Copyright (c) 2025 gearzhan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Disclaimer

This extension is an independent project and is not affiliated with, endorsed by, or sponsored by Google LLC or Gmail. Gmail is a trademark of Google LLC.

The extension is provided "as-is" without warranty of any kind. Use at your own risk. The authors are not responsible for any data loss, security issues, or other damages that may occur from using this extension.

By using this extension, you agree to:
- Review and understand the OAuth scopes requested
- Take responsibility for the security of your OAuth credentials
- Comply with Google's Terms of Service and API usage policies

## Acknowledgments

- Built with assistance from Claude Code (Anthropic)
- Inspired by Gmail's native label filtering interface
- Uses Google's Gmail API and Chrome Extension APIs

## Support

For questions, issues, or feature requests:
- 📖 Read the [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- 🐛 Report issues on GitHub
- 💬 Check [CLAUDE.md](./CLAUDE.md) for technical details

---

**Made with ❤️ for better Gmail label management**
