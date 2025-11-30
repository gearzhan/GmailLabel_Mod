// Service Worker - 处理 Gmail API 请求和 OAuth 认证

// 从存储获取 Client ID
async function getClientId() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['clientId'], (data) => {
      resolve(data.clientId || null);
    });
  });
}

// 从存储获取访问令牌（按账号隔离）
async function getStoredToken(accountKey = 'u0') {
  return new Promise((resolve) => {
    chrome.storage.local.get(['tokens'], (data) => {
      const tokens = data.tokens || {};
      const entry = tokens[accountKey];
      if (entry && entry.accessToken && entry.tokenExpiry && Date.now() < entry.tokenExpiry) {
        resolve(entry.accessToken);
      } else {
        resolve(null);
      }
    });
  });
}

// 保存访问令牌（按账号隔离）
async function saveToken(accountKey, token, expiresIn = 3600) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['tokens'], (data) => {
      const tokens = data.tokens || {};
      tokens[accountKey] = {
        accessToken: token,
        tokenExpiry: Date.now() + expiresIn * 1000
      };
      chrome.storage.local.set({ tokens }, resolve);
    });
  });
}

// 清除令牌（可针对单账号或全部）
async function clearToken(accountKey) {
  return new Promise((resolve) => {
    if (accountKey) {
      chrome.storage.local.get(['tokens'], (data) => {
        const tokens = data.tokens || {};
        delete tokens[accountKey];
        chrome.storage.local.set({ tokens }, resolve);
      });
      return;
    }
    chrome.storage.local.remove(['tokens'], resolve);
  });
}

// 启动 OAuth 流程
async function startOAuthFlow(accountKey = 'u0', interactive = true) {
  const clientId = await getClientId();

  if (!clientId) {
    throw new Error('请先在设置页面配置 Client ID');
  }

  const redirectUrl = chrome.identity.getRedirectURL();
  const scopes = 'https://www.googleapis.com/auth/gmail.modify';
  const authUser = (accountKey || 'u0').replace(/^u/, '');

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&response_type=token` +
    `&redirect_uri=${encodeURIComponent(redirectUrl)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&authuser=${encodeURIComponent(authUser)}`;

  try {
    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive
    });

    // 从响应 URL 中提取 access_token
    const params = new URLSearchParams(responseUrl.split('#')[1]);
    const accessToken = params.get('access_token');
    const expiresIn = parseInt(params.get('expires_in') || '3600', 10);

    if (!accessToken) {
      throw new Error('未能获取访问令牌');
    }

    // 保存令牌
    await saveToken(accountKey, accessToken, expiresIn);
    return accessToken;
  } catch (error) {
    console.error('OAuth flow error:', error);
    throw error;
  }
}

// 获取访问令牌（自动刷新）
async function getAuthToken(accountKey = 'u0', interactive = true) {
  // 先尝试从存储获取
  let token = await getStoredToken(accountKey);

  if (token) {
    return token;
  }

  // 如果没有有效令牌，启动 OAuth 流程
  token = await startOAuthFlow(accountKey, interactive);
  return token;
}

// 获取所有标签
async function fetchLabels(accountKey = 'u0') {
  try {
    const token = await getAuthToken(accountKey);
    const response = await fetch(
      'https://www.googleapis.com/gmail/v1/users/me/labels',
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      // 如果是 401 错误，清除令牌并重试
      if (response.status === 401) {
        await clearToken(accountKey);
        throw new Error('认证已过期，请重新授权');
      }
      // 403 indicates insufficient permissions (scope issue)
      if (response.status === 403) {
        await clearToken(accountKey);
        throw new Error('Insufficient permissions. Please re-authorize in settings.');
      }
      throw new Error(`Gmail API error: ${response.status}`);
    }

    const data = await response.json();
    const labels = data.labels || [];

    // 提取并存储颜色映射
    const colorMap = {};
    labels.forEach(label => {
      if (label.color) {
        colorMap[label.id] = {
          backgroundColor: label.color.backgroundColor || null,
          textColor: label.color.textColor || null
        };
      }
    });

    // 保存颜色映射到storage
    await chrome.storage.sync.set({ labelColorMap: colorMap });

    return labels;
  } catch (error) {
    console.error('Fetch labels error:', error);
    throw error;
  }
}

// 应用标签到单个消息
// 使用 messages/modify API 仅应用到特定消息
async function applyLabelToMessage(accountKey = 'u0', messageId, labelId) {
  try {
    const token = await getAuthToken(accountKey);

    console.log(`[SW] Applying label ${labelId} to message ${messageId}`);

    const response = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          addLabelIds: [labelId]
        })
      }
    );

    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401) {
        await clearToken(accountKey);
        throw new Error('Authentication expired. Please re-authorize.');
      }
      // Handle permission errors
      if (response.status === 403) {
        throw new Error('Insufficient permissions. Please re-authorize in settings.');
      }
      // Handle invalid message ID
      if (response.status === 404) {
        throw new Error('Message not found.');
      }

      throw new Error(`Gmail API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[SW] Label applied successfully:', data);
    return data;
  } catch (error) {
    console.error('[SW] Apply label error:', error);
    throw error;
  }
}

// 消息监听器
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_LABELS') {
    const accountKey = msg.accountKey || 'u0';
    // 异步处理
    fetchLabels(accountKey)
      .then(labels => {
        sendResponse({ ok: true, labels });
      })
      .catch(error => {
        sendResponse({ ok: false, error: error.message });
      });
    return true; // 保持消息通道开放以支持异步响应
  }

  if (msg.type === 'REVOKE_AUTH') {
    const accountKey = msg.accountKey; // 如果未传，清除全部
    // 撤销认证
    clearToken(accountKey)
      .then(() => {
        sendResponse({ ok: true });
      })
      .catch(error => {
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }

  if (msg.type === 'GET_AUTH_STATUS') {
    const accountKey = msg.accountKey || 'u0';
    // 检查认证状态
    getStoredToken(accountKey)
      .then(token => {
        sendResponse({ authenticated: !!token });
      });
    return true;
  }

  if (msg.type === 'GET_CLIENT_ID') {
    // 获取 Client ID
    getClientId()
      .then(clientId => {
        sendResponse({ clientId });
      });
    return true;
  }

  // Handle label application requests
  if (msg.type === 'APPLY_LABEL') {
    const accountKey = msg.accountKey || 'u0';
    const messageId = msg.messageId;
    const labelId = msg.labelId;

    if (!messageId || !labelId) {
      sendResponse({ ok: false, error: 'Missing required parameters' });
      return true;
    }

    applyLabelToMessage(accountKey, messageId, labelId)
      .then(data => {
        sendResponse({ ok: true, data });
      })
      .catch(error => {
        sendResponse({ ok: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }
});

// Install and upgrade initialization
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    console.log('Gmail Multi-Label Picker installed');
    chrome.runtime.openOptionsPage();
  }

  if (details.reason === 'update') {
    const previousVersion = details.previousVersion;
    const currentVersion = chrome.runtime.getManifest().version;

    // Detect upgrade from 0.1.x to 0.2.x (scope changed)
    if (previousVersion && previousVersion.startsWith('0.1') && currentVersion.startsWith('0.2')) {
      console.log('[MLP] Upgrade detected: clearing old tokens due to scope change');
      // Clear all old tokens (scope has changed)
      chrome.storage.local.remove(['tokens']);

      // Open options page to prompt user to re-authorize
      chrome.runtime.openOptionsPage();

      // Set flag to display upgrade banner
      chrome.storage.local.set({ scopeUpgradeNeeded: true });
    }
  }
});
