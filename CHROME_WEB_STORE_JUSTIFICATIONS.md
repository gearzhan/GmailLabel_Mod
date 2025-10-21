# Chrome Web Store Submission - Privacy Practices Justifications

This document contains all the required justifications for publishing the Gmail Multi-Label Picker extension to the Chrome Web Store.

---

## Single Purpose Description

**Field: Single Purpose Description**

```
This extension adds a customizable multi-label picker panel to Gmail, allowing users to search emails by selecting multiple labels with AND/OR logic, rename labels for personal organization, group labels into custom categories, and hide unwanted labels.
```

---

## Permission Justifications

### 1. activeTab Permission

**Field: activeTab Justification**

```
Required to inject the label picker panel UI into the active Gmail tab and enable the Search button to navigate to Gmail search results with the selected label filters.
```

---

### 2. Host Permissions

**Field: Host Permission Justification**

```
mail.google.com: Required to inject the content script that displays the label picker panel in Gmail's interface and to navigate to Gmail search results based on user-selected labels.

www.googleapis.com: Required to communicate with Gmail REST API (v1/users/me/labels) to fetch the user's Gmail label list for display in the picker panel.
```

---

### 3. identity Permission

**Field: identity Permission Justification**

```
Required to authenticate the user with Google OAuth 2.0 and obtain an access token for Gmail API access. This enables the extension to fetch the user's Gmail labels through the Gmail REST API. The authentication flow uses chrome.identity.launchWebAuthFlow with gmail.readonly scope.
```

---

### 4. scripting Permission

**Field: scripting Permission Justification**

```
Required to inject the label picker panel UI (content script) into Gmail pages. The panel is displayed as a floating interface at the bottom-left of Gmail, allowing users to select and filter labels.
```

---

### 5. storage Permission

**Field: storage Permission Justification**

```
Required to store user preferences and configuration data:
- chrome.storage.sync: Stores OAuth Client ID, label display name customizations, custom group definitions, label groupings, hidden label preferences, and UI state (collapsed groups, panel visibility).
- chrome.storage.local: Temporarily stores the Gmail API access token and its expiration timestamp to avoid repeated authentication prompts.

No personal data or email content is stored - only configuration settings and the temporary access token.
```

---

### 6. Remote Code Usage

**Field: Remote Code Justification**

```
This extension does NOT use remote code. All JavaScript code is included in the extension package (sw.js, content.js, options.js, popup.js). The extension only makes API calls to Gmail REST API (https://www.googleapis.com/gmail/v1/users/me/labels) to fetch label metadata and to Google OAuth endpoints for authentication. No code is fetched, loaded, or executed from external sources.
```

---

## Data Usage and Privacy Compliance

### Data Collection Declaration

**What data is collected:**
- OAuth access token (temporary, stored locally in chrome.storage.local, automatically expires)
- User preferences (label display names, custom groups, hidden labels - stored in chrome.storage.sync)

**What data is NOT collected:**
- ❌ Email content
- ❌ Email metadata (subjects, senders, recipients, dates)
- ❌ Personally identifiable information
- ❌ Browsing history
- ❌ User behavior analytics

### Data Usage

**OAuth Access Token:**
- Purpose: Authenticate Gmail API requests to fetch the user's label list
- Storage: chrome.storage.local (temporary, expires per token TTL)
- Transmission: Only sent to Gmail API endpoints (www.googleapis.com) with Authorization header
- Not shared with any third parties

**User Preferences:**
- Purpose: Persist user customizations (label names, groups, visibility) across browser sessions
- Storage: chrome.storage.sync (synced across user's Chrome instances)
- Not transmitted to any external servers
- Not shared with any third parties

### Data Sharing

**No data is shared with third parties.** All data remains local to the user's Chrome browser storage.

---

## Privacy Policy Summary

For the privacy policy URL field, you should host a privacy policy page that includes:

1. **What the extension does**: Provides a label picker interface for Gmail
2. **What permissions are used and why**: As detailed above
3. **What data is collected**: OAuth token and user preferences only
4. **How data is used**: Locally for extension functionality only
5. **Data sharing**: None - no third-party sharing
6. **Data retention**: OAuth tokens expire automatically; preferences stored until user uninstalls extension
7. **User rights**: Users can revoke OAuth access anytime via extension settings or Google account permissions
8. **Contact information**: Your email or support contact

---

## Additional Notes for Reviewers

- This extension uses **Manifest V3** (latest standard)
- All code execution happens locally within the extension package
- Gmail API access is **read-only** (gmail.readonly scope)
- The extension **does not modify** Gmail labels - it only reads them for display
- User can revoke OAuth authorization at any time through the extension's settings page
- Shadow DOM is used to isolate extension UI styles from Gmail's interface

---

## Developer Program Policy Compliance Checklist

✅ Single purpose: Enhance Gmail label searching and organization
✅ User data: Minimal collection (OAuth token + preferences only)
✅ Secure transmission: HTTPS only (Gmail API + OAuth)
✅ Prominent disclosure: Permission justifications provided above
✅ No deceptive behavior: Clear purpose and functionality
✅ No spam/malware: Clean, open-source code
✅ Privacy policy: Should be created and linked

---

## Quick Copy-Paste Guide

1. **Privacy practices tab** → Single purpose description → Copy text from section above
2. **Privacy practices tab** → activeTab justification → Copy from "activeTab Permission" section
3. **Privacy practices tab** → Host permissions justification → Copy from "Host Permissions" section
4. **Privacy practices tab** → identity justification → Copy from "identity Permission" section
5. **Privacy practices tab** → scripting justification → Copy from "scripting Permission" section
6. **Privacy practices tab** → storage justification → Copy from "storage Permission" section
7. **Privacy practices tab** → Remote code justification → Copy from "Remote Code Usage" section
8. **Privacy practices tab** → Data usage certification → Review "Data Usage and Privacy Compliance" section and certify compliance

---

**Last Updated**: 2025-10-22
**Extension Version**: 0.1.0
**Manifest Version**: 3
