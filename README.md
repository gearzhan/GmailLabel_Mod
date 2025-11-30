# Gmail Multi-Label Mod

![Version](https://img.shields.io/badge/version-0.2.0-blue.svg)
![Manifest](https://img.shields.io/badge/manifest-v3-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)



**Advanced label management, multi-select search, drag-and-drop label application, and Kanban-style organization for power users.**

Gmail Multi-Label Picker transforms how you interact with Gmail labels. It introduces a native "Material Design" overlay that allows for filtering, draggable label organization without altering your actual Gmail label structure.

------

## ⚠️ Breaking Change in v0.2.0

**Version 0.2.0 introduces drag-and-drop label application, which requires elevated permissions.**

### What Changed
- OAuth scope upgraded from `gmail.readonly` to `gmail.modify`
- Extension can now **apply labels** to emails via drag-and-drop
- **All users must re-authorize** after updating to v0.2.0

### Upgrade Instructions

1. **Update the Extension**
   - The extension will automatically update via Chrome Web Store
   - OR manually reload in `chrome://extensions/` if using unpacked version

2. **Re-authorize**
   - After update, the extension will automatically open the Options page
   - Your old authentication tokens have been cleared for security
   - Click **"Authorize Now"** button (or **"Refresh Labels"**)
   - Grant the new `gmail.modify` permission when prompted
   - You can now drag labels onto emails to apply them!

3. **Verify**
   - Go to Gmail
   - Open the label picker panel (click FAB button)
   - Try dragging a label onto an email
   - You should see a success toast notification

### What if I don't want the new permission?

If you prefer to keep read-only access:
- Stay on v0.1.x (disable auto-update in Chrome)
- You will not be able to use the drag-and-drop label application feature
- All other features (label search, filtering, groups) will continue to work

------



## ✨ Features



- **Drag-and-Drop Label Application (NEW):** Drag labels directly from the panel onto emails to apply them instantly. Toast notifications confirm success. Works in all Gmail views.
- **Multi-Select Search:** Select multiple labels to filter emails. Switch easily between **Match ALL** (AND) and **Match ANY** (OR) logic.
- **Kanban Organization:** Organize your labels into custom groups (e.g., "Work", "Personal", "Backlog") using a drag-and-drop board in the settings.
- **Visual Customization:** Rename labels (alias) for display purposes and hide unwanted labels from the picker without deleting them from Gmail.
- **Privacy Focused:** Direct communication between your browser and the Gmail API. No third-party servers involved.

------



## 🚀 Installation



### Option A: From Chrome Web Store



*(Link to Chrome Web Store would go here once published)*



### Option B: Manual Installation (Unpacked)



1. Download or Clone this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Toggle **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the folder containing these files.
5. **Important:** Note the `ID` string generated for the extension (e.g., `abcdefghijklmnop...`). You will need this for the configuration step below.

------



## ⚙️ Configuration Guide (Required)



Because this extension interacts directly with your Gmail data securely, it requires a **Google Cloud Client ID**. This ensures you have full control over the permissions granted.



### Step 1: Create a Google Cloud Project



1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown (top left) and select **New Project**.
3. Name it `Gmail_Label_Mod` and click **Create**.



### Step 2: Enable Gmail API



1. In the sidebar, go to **APIs & Services > Library**.
2. Search for **Gmail API**.
3. Click on it and press **Enable**.



### Step 3: Configure Consent Screen



1. Go to **APIs & Services > OAuth consent screen**.
2. Select **External** and click **Create**.
3. **App Information:** Fill in the App Name (e.g., "Gmail Label Mod") and your email for support/developer contact.
4. Click **Save and Continue**.
5. **Scopes:** Click **Add or Remove Scopes**. Search for and select:
   - `https://www.googleapis.com/auth/gmail.modify` (Required for label application in v0.2.0+)
6. Click **Save and Continue**.
7. **Test Users:** Click **Add Users** and enter your own Gmail address. (This is required until the app is verified by Google, but for personal use, Test Mode is sufficient).



### Step 4: Create Credentials (The Key Step)



1. Go to **APIs & Services > Credentials**.
2. Click **+ CREATE CREDENTIALS** and select **OAuth client ID**.
3. **Application type:** Select **Chrome extension**.
4. **Name:** Enter a name (e.g., "My Extension").
5. **Item ID:** Paste the Extension ID you copied from `chrome://extensions/` during installation.
6. Click **Create**.
7. Copy the **Client ID** that is generated (it ends in `.apps.googleusercontent.com`).



### Step 5: Activate the Extension



1. Right-click the Gmail Multi-Label Picker icon in your browser toolbar and select **Options** (or click "Open Settings" from the popup).
2. In the "OAuth Configuration" section, paste your **Client ID**.
3. Click **Save**.
4. Click the **Refresh Labels** button (or "Authorize Now"). A Google popup will appear asking for permission. Allow access.

✅ **Setup Complete!** Your labels will now load.

------



## 📖 User Guide

### Using the Overlay (In Gmail)

1. Open Gmail. You will see a **Floating Action Button (Tag Icon)** in the bottom-left corner.
2. Click it to expand the Label Picker panel.
3. **Click labels** to select them. They will appear as "chips" at the top of the panel.
4. Use the **ALL / ANY** switch to determine if you want emails containing *all* selected labels or *any* of them.
5. Click **Search** to filter your inbox.
6. **NEW: Drag-and-Drop** - Drag any label from the panel and drop it onto an email to apply that label instantly. A toast notification will confirm success or show errors.



### Organizing Labels (Options Page)

1. Open the Extension **Settings/Options**.
2. You will see a **Kanban Board** layout.
3. **Create Groups:** Scroll to the right or look for the "Create Group" section to add buckets like "High Priority" or "Newsletters".
4. **Drag and Drop:** Drag labels from the "Ungrouped" column into your custom groups.
5. **Renaming:** Click on a label card to give it a shorter "Display Name" (e.g., rename "INBOX/Notifications/Updates" to just "Updates").
6. **Hiding:** Check the "Hidden" box on a card to remove it from the Gmail overlay (it stays in your actual Gmail account).
7. Click **Save Settings** to apply changes.



### Backup & Restore

- Use the **Export Configuration** button in Settings to save your groups and renames to a JSON file.
- Use **Import** to restore them on another computer.

------



## ❓ Troubleshooting

Q: I get an "Authorization Error 400: redirect_uri_mismatch".

A: Ensure you selected Chrome Extension as the application type in Google Cloud Credentials, and that the Item ID exactly matches the ID of the extension in your browser.

Q: Labels aren't loading.

A: Go to Settings and click "Refresh Labels". If that fails, check if you added your email address to the "Test Users" list in the Google Cloud OAuth Consent Screen configuration.

Q: The panel covers my emails.

A: The panel is collapsible. Click the floating button to shrink it. You can also drag the floating button to a different position (if enabled in future updates).



## 🔒 Privacy & Security

- **Local Storage:** Your OAuth tokens and preferences are stored locally in your browser (`chrome.storage`).
- **Direct Connection:** The extension communicates directly with Google's API (`googleapis.com`). No data is sent to the developer or third-party analytics servers.
- **Limited Scope:** The extension requests `gmail.modify` permission to fetch labels and apply them to messages. It can read labels and modify message labels, but **cannot** read email contents, send emails, or delete emails. The `gmail.modify` scope is the minimum required for label management.
