# Gmail Multi-Label Picker - Setup Guide

This guide will help you set up the Gmail Multi-Label Picker Chrome Extension with OAuth authentication.

A Chrome Extension that enhances Gmail's label management with multi-select filtering, custom grouping, and advanced organization features.

Note,

1. requires OAuth 2.0 Client ID with Gmail API enable.
2. Creat CLient ID for Web Application, and fill Autherised redirect URLs : https://gpfghhempenkdpnekpjggkccfmjbfoid.chromiumapp.org/

## Prerequisites

- Google Account
- Chrome Browser
- Basic familiarity with Chrome Extensions and Google Cloud Console

---

## Step 1: Create Google Cloud Project

1. Navigate to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google Account
3. Click "Select a project" → "New Project"
4. Enter project name (e.g., "Gmail Multi-Label Picker")
5. Click "Create"

---

## Step 2: Enable Gmail API

1. In the Google Cloud Console, ensure your project is selected
2. Navigate to **"APIs & Services"** → **"Library"**
3. Search for **"Gmail API"**
4. Click on the Gmail API result
5. Click **"Enable"**
6. Wait for the API to be enabled (usually takes a few seconds)

---

## Step 3: Create OAuth 2.0 Client ID

1. Navigate to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. If prompted, configure the OAuth consent screen:
   - User Type: **External** (or Internal if using Google Workspace)
   - App name: `Gmail Multi-Label Picker`
   - User support email: Your email
   - Developer contact: Your email
   - Click "Save and Continue"
   - Scopes: Click "Save and Continue" (we'll add scopes automatically)
   - Test users: Add your email if using External
   - Click "Save and Continue"

4. Back to "Create OAuth client ID":
   - **Application type**: Select **"Chrome Extension"**
     - If "Chrome Extension" is not available, use **"Web application"**
   - **Name**: `Gmail Multi-Label Picker` (or any name you prefer)

5. **For Chrome Extension type**:
   - **Application ID**: You need your Chrome Extension ID first
   - See "Step 4" below to get the Extension ID, then return here

6. **For Web application type**:
   - **Authorized redirect URIs**: Add `https://<EXTENSION_ID>.chromiumapp.org/`
   - Replace `<EXTENSION_ID>` with your actual Extension ID (see Step 4)

7. Click **"Create"**
8. **Copy the Client ID** (format: `xxxxxxxxxxxxx.apps.googleusercontent.com`)
9. Keep this window open or save the Client ID somewhere safe

---

## Step 4: Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Navigate to and select the folder: `/Users/gearzhan/cProjects/GLabel_Mod/`
5. The extension should now appear in your extensions list
6. **Copy the Extension ID** (looks like: `abcdefghijklmnopqrstuvwxyz123456`)
   - If you haven't created the OAuth Client ID yet, use this ID in Step 3

---

## Step 5: Configure Extension Settings

1. Click the **Extensions icon** (puzzle piece) in Chrome toolbar
2. Find **"Gmail Multi-Label Picker"** and click the **pin icon** to pin it
3. Click the extension icon, then click **"Settings"**
   - OR right-click the extension icon → **"Options"**

4. In the settings page:
   - Paste your **Client ID** (from Step 3) into the input field
   - Click **"Save"**
   - You should see a success message

---

## Step 6: Authorize Gmail Access

1. Navigate to [Gmail](https://mail.google.com/)
2. Wait for Gmail to fully load
3. Look for the blue floating action button (FAB) at the bottom-left corner
   - Default state: Collapsed (shows only the button)
4. Click the FAB to expand the panel
5. If this is your first time:
   - You may be prompted to authorize the extension
   - Click "Authorize" or sign in to your Google Account
   - Grant the requested permissions:
     - Read Gmail labels
     - Access Gmail data
6. After authorization, labels should load automatically

---

## Step 7: Using the Extension

### Expanding/Collapsing the Panel

- Click the blue FAB button to toggle the panel
- State is saved automatically (persists across page reloads)

### Selecting Labels
- Click labels to select/deselect them
- Selected labels turn blue
- Use the filter box to search for specific labels

### Search Modes
- **AND Mode** (default): Find emails with ALL selected labels
- **OR Mode**: Find emails with ANY selected label
- Click the mode button to toggle

### Searching
1. Select one or more labels
2. Choose AND/OR mode
3. Click **"Search"** button
4. Gmail will navigate to search results

### Organizing Labels
In the settings page (Options), you can:
- **Rename labels**: Change display names (doesn't affect Gmail)
- **Create custom groups**: Organize labels into categories
- **Hide labels**: Hide unwanted labels from the panel
- **Manage groups**: Expand/collapse groups

---

## Troubleshooting

### Error: "请先在设置页面配置 Client ID"
**Solution**: You need to configure the OAuth Client ID in the extension settings (see Step 5)

### Error: "Failed to load labels: 401 Unauthorized"
**Solution**:
- Your access token may have expired
- Click the extension icon → "Settings" → "Revoke Authorization"
- Reload Gmail and authorize again

### Panel doesn't appear
**Solution**:
- Ensure you're on `mail.google.com`
- Reload the Gmail page
- Check Chrome DevTools Console for errors (F12)
- Ensure the extension is enabled at `chrome://extensions/`

### Labels don't load
**Solution**:
- Check that Gmail API is enabled in Google Cloud Console
- Verify OAuth Client ID is correct (must end with `.apps.googleusercontent.com`)
- Check the extension ID matches the one in OAuth credentials
- Try revoking and re-authorizing in settings

### Extension not showing in `chrome://extensions/`
**Solution**:
- Ensure "Developer mode" is enabled
- Try reloading the extension (click the refresh icon)
- Check the manifest.json file exists and is valid

---

## OAuth Scopes Used

The extension requests the following Gmail API scopes:
- `https://www.googleapis.com/auth/gmail.labels` - Read Gmail labels
- `https://www.googleapis.com/auth/gmail.readonly` - Read Gmail data (for search)

These are read-only scopes and do not allow the extension to send emails or modify your Gmail data.

---

## Privacy & Security

- **No data collection**: This extension does not collect or transmit any personal data
- **Local storage only**: All settings are stored locally in Chrome's sync storage
- **Read-only access**: The extension only reads labels and performs searches
- **OAuth 2.0**: Industry-standard authentication protocol
- **Open source**: All code is available for review in the project folder

---

## Multi-Account Support

The extension supports multiple Gmail accounts:
- It detects the current account from the URL (`/u/0/`, `/u/1/`, etc.)
- Searches are performed in the active account
- Each account requires separate authorization

---

## Uninstalling

To remove the extension:
1. Go to `chrome://extensions/`
2. Find "Gmail Multi-Label Picker"
3. Click "Remove"
4. Optionally, revoke access:
   - Go to [Google Account Permissions](https://myaccount.google.com/permissions)
   - Find "Gmail Multi-Label Picker"
   - Click "Remove Access"

---

## Support

For issues, questions, or feature requests:
- Check the [CLAUDE.md](./CLAUDE.md) file for technical details
- Review the source code in the project directory
- Create an issue in the project repository (if available)

---

## Version Information

- **Manifest Version**: V3
- **Minimum Chrome Version**: 88+
- **Last Updated**: 2025-10-21

---

## License

This extension is provided as-is for personal use. Please review the license file (if available) for more information.
