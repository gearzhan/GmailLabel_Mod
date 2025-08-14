// Gmail标签管理器 - 后台脚本
// 处理扩展生命周期和API调用

/**
 * 扩展安装时的初始化函数
 * 设置默认配置和存储结构
 */
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Gmail Label Manager installed');
  
  // 初始化默认配置
    const defaultConfig = {
    userConfig: {
      enableDragAndDrop: true
    },
    customLabels: {},
    labelOrder: {
      orderedLabelIds: [],
      lastModified: Date.now()
    }
  };
  
  // 检查是否已有配置，如果没有则设置默认配置
  try {
    const existingConfig = await chrome.storage.sync.get(['userConfig']);
    if (!existingConfig.userConfig) {
      await chrome.storage.sync.set(defaultConfig);
      console.log('Default configuration set');
    }
  } catch (error) {
    console.error('Error setting default configuration:', error);
  }
});

/**
 * 处理来自content script的消息
 * 用于配置管理和数据同步
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  switch (request.action) {
    case 'getConfig':
      // 获取用户配置
      handleGetConfig(sendResponse);
      return true; // 保持消息通道开放
      
    case 'saveConfig':
      // 保存用户配置
      handleSaveConfig(request.config, sendResponse);
      return true;
      
    case 'saveLabelOrder':
      // 保存标签顺序
      handleSaveLabelOrder(request.labelOrder, sendResponse);
      return true;
      
    case 'saveCustomLabels':
      // 保存自定义标签名称
      handleSaveCustomLabels(request.customLabels, sendResponse);
      return true;
      
    case 'getGmailLabels':
      // 获取Gmail标签数据
      handleGetGmailLabels(sendResponse);
      return true;
      
    case 'refreshGmailPages':
      // 刷新所有Gmail页面
      handleRefreshGmailPages(sendResponse);
      return true;
      
    default:
      console.warn('Unknown action:', request.action);
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

/**
 * 获取用户配置
 */
async function handleGetConfig(sendResponse) {
  try {
    const result = await chrome.storage.sync.get(['userConfig', 'customLabels', 'labelOrder']);

    // 兼容旧版本，填充默认字段
    const merged = {
      userConfig: {
        enableDragAndDrop: true,
        ...(result.userConfig || {})
      },
      customLabels: result.customLabels || {},
      labelOrder: result.labelOrder || { orderedLabelIds: [], lastModified: Date.now() }
    };

    // 回写存储，保证后续读取到完整结构
    await chrome.storage.sync.set(merged);

    sendResponse({ success: true, data: merged });
  } catch (error) {
    console.error('Error getting config:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * 保存用户配置
 */
async function handleSaveConfig(config, sendResponse) {
  try {
    await chrome.storage.sync.set({ userConfig: config });
    console.log('User config saved:', config);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error saving config:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * 保存标签顺序
 */
async function handleSaveLabelOrder(labelOrder, sendResponse) {
  try {
    const orderData = {
      orderedLabelIds: labelOrder,
      lastModified: Date.now()
    };
    await chrome.storage.sync.set({ labelOrder: orderData });
    console.log('Label order saved:', orderData);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error saving label order:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * 保存自定义标签名称
 */
async function handleSaveCustomLabels(customLabels, sendResponse) {
  try {
    await chrome.storage.sync.set({ customLabels: customLabels });
    console.log('Custom labels saved:', customLabels);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error saving custom labels:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * 获取Gmail标签数据
 * 向Gmail页面的content script请求标签信息
 */
async function handleGetGmailLabels(sendResponse) {
  try {
    // 查找Gmail标签页
    const tabs = await chrome.tabs.query({ url: 'https://mail.google.com/*' });
    
    if (tabs.length === 0) {
      sendResponse({ 
        success: false, 
        error: 'No Gmail tabs found. Please open Gmail first.' 
      });
      return;
    }
    
    // 选择一个加载完成且可用的Gmail标签页
    const gmailTab = tabs.find(t => t.status === 'complete') || tabs[0];
    
    chrome.tabs.sendMessage(gmailTab.id, {
      action: 'getLabels'
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting labels from content script:', chrome.runtime.lastError);
        // 尝试在该tab主动注入content脚本（某些情况下未匹配到frame）
        try {
          chrome.scripting.executeScript({
            target: { tabId: gmailTab.id, allFrames: true },
            files: ['content.js']
          }, () => {
            if (chrome.runtime.lastError) {
              sendResponse({
                success: false,
                error: 'Failed to communicate with Gmail page. Please refresh Gmail and try again.'
              });
            } else {
              // 再次尝试，限定仅顶层 frame 响应
              chrome.tabs.sendMessage(gmailTab.id, { action: 'getLabels' }, (retryResponse) => {
                if (chrome.runtime.lastError || !retryResponse?.success) {
                  sendResponse({
                    success: false,
                    error: retryResponse?.error || 'Failed to get labels after reinjection.'
                  });
                } else {
                  sendResponse({ success: true, labels: retryResponse.labels });
                }
              });
            }
          });
        } catch (e) {
          sendResponse({ 
            success: false, 
            error: 'Failed to communicate with Gmail page. Please refresh Gmail and try again.' 
          });
        }
        return true; // keep port open while reinjecting
      }
      
      if (response && response.success) {
        console.log('Gmail labels retrieved:', response.labels);
        sendResponse({ 
          success: true, 
          labels: response.labels 
        });
      } else {
        sendResponse({ 
          success: false, 
          error: response?.error || 'Failed to get labels from Gmail page' 
        });
      }
    });
    
  } catch (error) {
    console.error('Error in handleGetGmailLabels:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * 刷新所有Gmail页面
 */
async function handleRefreshGmailPages(sendResponse) {
  try {
    // 查找所有Gmail标签页
    const tabs = await chrome.tabs.query({ url: 'https://mail.google.com/*' });
    
    if (tabs.length === 0) {
      sendResponse({ 
        success: true, 
        message: 'No Gmail tabs found to refresh.' 
      });
      return;
    }
    
    // 刷新所有Gmail标签页
    const refreshPromises = tabs.map(tab => {
      return new Promise((resolve) => {
        chrome.tabs.reload(tab.id, {}, () => {
          if (chrome.runtime.lastError) {
            console.warn(`Failed to refresh tab ${tab.id}:`, chrome.runtime.lastError);
            resolve({ success: false, tabId: tab.id, error: chrome.runtime.lastError.message });
          } else {
            console.log(`Gmail tab ${tab.id} refreshed successfully`);
            resolve({ success: true, tabId: tab.id });
          }
        });
      });
    });
    
    const results = await Promise.all(refreshPromises);
    const successCount = results.filter(r => r.success).length;
    
    sendResponse({ 
      success: true, 
      message: `Refreshed ${successCount} of ${tabs.length} Gmail tabs.`,
      results: results
    });
    
  } catch (error) {
    console.error('Error in handleRefreshGmailPages:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * 处理扩展图标点击事件
 * 打开popup或options页面
 */
chrome.action.onClicked.addListener((tab) => {
  // 如果在Gmail页面，显示popup；否则打开options页面
  if (tab.url && tab.url.includes('mail.google.com')) {
    // popup会自动显示
    console.log('Opening popup for Gmail tab');
  } else {
    chrome.runtime.openOptionsPage();
  }
});

/**
 * 监听存储变化，用于同步配置
 */
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('Storage changed:', changes, 'in namespace:', namespace);
  
  // 通知所有content scripts配置已更新
  chrome.tabs.query({ url: 'https://mail.google.com/*' }, (tabs) => {
    tabs.forEach(tab => {
      try {
        chrome.tabs.sendMessage(tab.id, {
          action: 'configUpdated',
          changes: changes
        }, () => {
          // 如果发送失败（例如页面未注入content script），忽略错误
          // 仅在调试时记录
          if (chrome.runtime.lastError) {
            // console.debug('Could not send message to tab:', tab.id, chrome.runtime.lastError.message);
          }
        });
      } catch (e) {
        // 在极少数情况下，调用本身会抛出同步错误
        // 忽略即可
      }
    });
  });
});