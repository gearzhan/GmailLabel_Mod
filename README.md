# Gmail Label Manager

A Chrome extension that enhances Gmail's label management capabilities with custom naming, reordering, and visual improvements.

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

### 🎨 User Interface
- **Modern Design**: Clean, intuitive interface that matches Gmail's aesthetic
- **Search Functionality**: Quickly find specific labels in the management interface
- **Visual Indicators**: Clear distinction between user and system labels with badges

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the project folder
5. The extension icon will appear in your Chrome toolbar

## Usage

### Basic Label Management
1. Click the extension icon to open the popup menu
2. Use "Open Advanced Settings" to access the full options page
3. In the options page, you can:
   - View all your Gmail labels (both user and system)
   - Customize display names for user labels
   - Reorder labels using drag and drop
   - Search through your labels

### Customizing Labels
1. In the options page, find the label you want to customize
2. Enter a custom name in the input field next to the label
3. Click "Save Changes" to apply your modifications
4. The changes will be reflected immediately in Gmail's sidebar

### Reordering Labels
1. In the options page, ensure "Enable drag & drop reordering" is enabled
2. Use the drag handle (⋮⋮) to drag and drop labels into your preferred order
3. Click "Save Changes" to persist the new order
4. The new order will be applied to Gmail's sidebar

### Resetting to Defaults
1. In the options page, click "Reset to Defaults"
2. Confirm the action when prompted
3. All custom names and label orders will be cleared
4. Gmail will be refreshed to show the original state

## Configuration

### General Settings
- **Enable drag & drop reordering**: Toggle the drag and drop functionality for label reordering

### Label Management
- **Custom Names**: Set alternative display names for your labels
- **Label Order**: Customize the sequence in which labels appear in Gmail's sidebar
- **Search**: Quickly locate specific labels in the management interface

## Technical Details

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

## Browser Compatibility

- **Chrome**: 88+ (Manifest V3 support required)
- **Edge**: 88+ (Chromium-based)
- **Other Chromium browsers**: Should work with Manifest V3 support

## Development

### Building
This extension is ready to use without any build process. Simply load the folder as an unpacked extension in Chrome.

### Modifying
- Edit the JavaScript files to modify functionality
- Update HTML files to change the interface
- Modify CSS for styling changes
- Update `manifest.json` for permission or configuration changes

### Testing
1. Make your changes
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes in Gmail

## Troubleshooting

### Extension Not Working
1. Ensure you're on a Gmail page (`mail.google.com`)
2. Check that the extension is enabled in `chrome://extensions/`
3. Try refreshing the Gmail page
4. Check the browser console for any error messages

### Labels Not Updating
1. Click "Save Changes" in the options page
2. Refresh the Gmail page
3. Ensure the extension has the necessary permissions

### Reset Issues
1. Use "Reset to Defaults" in the options page
2. Manually clear browser storage if needed
3. Reinstall the extension

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the browser console for error messages
3. Create an issue in the repository

---

**Note**: This extension modifies Gmail's interface and may be affected by Gmail updates. If you encounter issues after a Gmail update, please report them so the extension can be updated accordingly.
