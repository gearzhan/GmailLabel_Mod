// Service Worker - 处理 Gmail API 请求和 OAuth 认证

// 从存储获取 Client ID
async function getClientId() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['clientId'], (data) => {
      resolve(data.clientId || null);
    });
  });
}

// 从存储获取访问令牌
async function getStoredToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['accessToken', 'tokenExpiry'], (data) => {
      // 检查令牌是否过期
      if (data.accessToken && data.tokenExpiry && Date.now() < data.tokenExpiry) {
        resolve(data.accessToken);
      } else {
        resolve(null);
      }
    });
  });
}

// 保存访问令牌
async function saveToken(token, expiresIn = 3600) {
  return new Promise((resolve) => {
    chrome.storage.local.set({
      accessToken: token,
      tokenExpiry: Date.now() + expiresIn * 1000
    }, resolve);
  });
}

// 清除令牌
async function clearToken() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['accessToken', 'tokenExpiry'], resolve);
  });
}

// 启动 OAuth 流程
async function startOAuthFlow(interactive = true) {
  const clientId = await getClientId();

  if (!clientId) {
    throw new Error('请先在设置页面配置 Client ID');
  }

  const redirectUrl = chrome.identity.getRedirectURL();
  const scopes = 'https://www.googleapis.com/auth/gmail.readonly';

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&response_type=token` +
    `&redirect_uri=${encodeURIComponent(redirectUrl)}` +
    `&scope=${encodeURIComponent(scopes)}`;

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
    await saveToken(accessToken, expiresIn);
    return accessToken;
  } catch (error) {
    console.error('OAuth flow error:', error);
    throw error;
  }
}

// 获取访问令牌（自动刷新）
async function getAuthToken(interactive = true) {
  // 先尝试从存储获取
  let token = await getStoredToken();

  if (token) {
    return token;
  }

  // 如果没有有效令牌，启动 OAuth 流程
  token = await startOAuthFlow(interactive);
  return token;
}

// 获取所有标签
async function fetchLabels() {
  try {
    const token = await getAuthToken();
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
        await clearToken();
        throw new Error('认证已过期，请重新授权');
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

// 消息监听器
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_LABELS') {
    // 异步处理
    fetchLabels()
      .then(labels => {
        sendResponse({ ok: true, labels });
      })
      .catch(error => {
        sendResponse({ ok: false, error: error.message });
      });
    return true; // 保持消息通道开放以支持异步响应
  }

  if (msg.type === 'REVOKE_AUTH') {
    // 撤销认证
    clearToken()
      .then(() => {
        sendResponse({ ok: true });
      })
      .catch(error => {
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  }

  if (msg.type === 'GET_AUTH_STATUS') {
    // 检查认证状态
    getStoredToken()
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
});

// 安装时初始化
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    console.log('Gmail Multi-Label Picker installed');
    // 打开配置页面
    chrome.runtime.openOptionsPage();
  }
});
