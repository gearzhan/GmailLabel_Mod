/**
 * 内容脚本主文件
 * 与Gmail界面交互的核心脚本
 */

// 消息类型常量（从constants.js导入）
const MESSAGE_TYPES = {
  LABEL_APPLIED: 'labelApplied',
  LABEL_DETECTED: 'labelDetected',
  SETTINGS_UPDATED: 'settingsUpdated',
  CACHE_UPDATED: 'cacheUpdated'
};

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 内容脚本主类
 */
class ContentScript {
  constructor() {
    this.isInitialized = false;
    this.observers = [];
    this.settings = null;
    this.labelCache = new Map();
    
    // 确保在Gmail页面才初始化
    if (isGmailPage()) {
      this.init();
    }
  }

  /**
   * 初始化内容脚本
   */
  async init() {
    try {
      debugLog('Initializing content script');
      
      // 等待Gmail界面加载
      await this.waitForGmailLoad();
      
      // 加载用户设置和缓存
      await this.loadSettings();
      await this.loadLabelCache();
      
      // 设置消息监听器
      this.setupMessageListeners();
      
      // 启动Gmail拦截器
      if (window.gmailInterceptor) {
        debugLog('Initializing Gmail interceptor');
        window.gmailInterceptor.init();
      } else {
        errorLog('Gmail interceptor not found on window object');
      }
      
      // 启动DOM观察器
      if (window.domObserver) {
        debugLog('Initializing DOM observer');
        window.domObserver.init();
      } else {
        errorLog('DOM observer not found on window object');
      }
      
      // 应用自定义标签显示
      await this.applyCustomLabelDisplay();
      
      this.isInitialized = true;
      debugLog('Content script initialized successfully');
    } catch (error) {
      errorLog('Failed to initialize content script', error);
    }
  }

  /**
   * 等待Gmail界面加载完成
   */
  async waitForGmailLoad() {
    try {
      // 等待Gmail主界面加载
      await waitForElement('div[role="main"]', 10000);
      debugLog('Gmail main interface loaded');
      
      // 等待Gmail侧边栏加载
      const sidebar = await waitForGmailSidebar();
      if (sidebar) {
        debugLog('Gmail sidebar loaded successfully');
        // 立即扫描标签
        await this.scanLabelsFromSidebar(sidebar);
      } else {
        errorLog('Gmail sidebar failed to load');
      }
    } catch (error) {
      errorLog('Gmail interface load error', error);
      throw error;
    }
  }

  /**
   * 加载用户设置
   */
  async loadSettings() {
    try {
      this.settings = await storage.getUserSettings();
      debugLog('Settings loaded', this.settings);
    } catch (error) {
      errorLog('Failed to load settings', error);
    }
  }

  /**
   * 加载标签缓存
   */
  async loadLabelCache() {
    try {
      const cache = await storage.getLabelCache();
      this.labelCache = new Map(Object.entries(cache));
      debugLog('Label cache loaded', cache);
    } catch (error) {
      errorLog('Failed to load label cache', error);
    }
  }

  /**
   * 设置消息监听器
   */
  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 保持消息通道开放
    });
  }

  /**
   * 处理来自后台脚本的消息
   * @param {Object} message - 消息对象
   * @param {Object} sender - 发送者信息
   * @param {Function} sendResponse - 响应函数
   */
  async handleMessage(message, sender, sendResponse) {
    try {
      debugLog('Received message', message);

      switch (message.type) {
        case MESSAGE_TYPES.SETTINGS_UPDATED:
          await this.handleSettingsUpdated(message.data);
          sendResponse({ success: true });
          break;

        case MESSAGE_TYPES.LABEL_APPLIED:
          await this.handleLabelApplied(message.data);
          sendResponse({ success: true });
          break;

        default:
          debugLog('Unknown message type', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      errorLog('Error handling message', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * 处理设置更新
   * @param {Object} newSettings - 新设置
   */
  async handleSettingsUpdated(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    debugLog('Settings updated', this.settings);
    
    // 重新应用自定义标签显示
    await this.applyCustomLabelDisplay();
  }

  /**
   * 处理标签应用事件
   * @param {Object} data - 标签数据
   */
  async handleLabelApplied(data) {
    debugLog('Label applied notification', data);
    
    // 更新本地缓存
    if (data.labelId && data.labelName) {
      this.labelCache.set(data.labelId, {
        name: data.labelName,
        lastSeen: Date.now()
      });
    }
    
    // 如果启用了通知，显示通知
    if (this.settings?.showNotifications) {
      this.showNotification(`Label "${data.labelName}" applied to reply`);
    }
  }

  /**
   * 应用自定义标签显示
   */
  async applyCustomLabelDisplay() {
    try {
      if (!this.settings?.customLabelNames) {
        return;
      }

      debugLog('Applying custom label display');
      
      // 查找所有标签元素并应用自定义名称
      const labelElements = document.querySelectorAll('[data-legacy-label-id]');
      
      for (const element of labelElements) {
        const labelId = element.getAttribute('data-legacy-label-id');
        const customName = this.settings.customLabelNames[labelId];
        
        if (customName && element.textContent !== customName) {
          element.textContent = customName;
          element.setAttribute('data-custom-label', 'true');
          debugLog(`Applied custom name "${customName}" to label ${labelId}`);
        }
      }
    } catch (error) {
      errorLog('Failed to apply custom label display', error);
    }
  }

  /**
   * 检测回复邮件场景
   * @param {Element} composeElement - 撰写邮件元素
   * @returns {Object|null} 检测到的标签信息
   */
  detectReplyLabels(composeElement) {
    try {
      // 查找原始邮件的标签信息
      const threadElement = composeElement.closest('[data-legacy-thread-id]');
      if (!threadElement) {
        return null;
      }

      const threadId = threadElement.getAttribute('data-legacy-thread-id');
      const labelElements = threadElement.querySelectorAll('[data-legacy-label-id]');
      
      const labels = Array.from(labelElements).map(element => ({
        id: element.getAttribute('data-legacy-label-id'),
        name: element.textContent.trim()
      }));

      if (labels.length > 0) {
        debugLog('Detected reply labels', { threadId, labels });
        return { threadId, labels };
      }
    } catch (error) {
      errorLog('Failed to detect reply labels', error);
    }
    
    return null;
  }

  /**
   * 自动应用标签到回复邮件
   * @param {Array} labels - 要应用的标签
   * @param {string} threadId - 线程ID
   */
  async autoApplyLabels(labels, threadId) {
    try {
      debugLog('Auto applying labels', { labels, threadId });
      
      for (const label of labels) {
        // 发送消息到后台脚本记录标签应用
        await chrome.runtime.sendMessage({
          type: MESSAGE_TYPES.LABEL_DETECTED,
          data: {
            labelId: label.id,
            labelName: label.name,
            threadId: threadId,
            action: 'auto_apply'
          }
        });
      }
    } catch (error) {
      errorLog('Failed to auto apply labels', error);
    }
  }

  /**
   * 显示通知
   * @param {string} message - 通知消息
   */
  showNotification(message) {
    // 创建简单的页面内通知
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // 3秒后自动移除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  /**
   * 从侧边栏扫描标签
   * @param {Element} sidebar - 侧边栏元素
   */
  async scanLabelsFromSidebar(sidebar) {
    try {
      debugLog('Scanning labels from sidebar');
      
      const labels = extractLabelsFromSidebar(sidebar);
      
      if (labels.length > 0) {
        debugLog(`Found ${labels.length} labels in sidebar`);
        
        // 将标签信息发送到后台脚本
        for (const label of labels) {
          await this.notifyLabelDetected(label.text, label.element);
        }
        
        // 设置侧边栏变化监听器
        this.setupSidebarObserver(sidebar);
      } else {
        debugLog('No labels found in sidebar');
      }
    } catch (error) {
      errorLog('Error scanning labels from sidebar', error);
    }
  }

  /**
   * 设置侧边栏观察器
   * @param {Element} sidebar - 侧边栏元素
   */
  setupSidebarObserver(sidebar) {
    const observer = new MutationObserver(debounce(() => {
      debugLog('Sidebar content changed, rescanning labels');
      this.scanLabelsFromSidebar(sidebar);
    }, 500));
    
    observer.observe(sidebar, {
      childList: true,
      subtree: true
    });
    
    this.observers.push(observer);
    debugLog('Sidebar observer setup complete');
  }

  /**
   * 通知后台脚本检测到标签
   * @param {string} labelText - 标签文本
   * @param {Element} labelElement - 标签元素
   */
  async notifyLabelDetected(labelText, labelElement) {
    try {
      // 生成标签ID（使用文本作为ID）
      const labelId = labelText.toLowerCase().replace(/\s+/g, '_');
      
      // 发送消息到后台脚本
      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.LABEL_DETECTED,
        data: {
          labelId: labelId,
          labelName: labelText,
          element: labelElement.outerHTML // 用于调试
        }
      });
      
      debugLog('Label detection notification sent', { labelId, labelText });
      
      // 缓存标签信息
      this.labelCache.set(labelId, {
        id: labelId,
        name: labelText,
        element: labelElement,
        lastSeen: Date.now()
      });
      
    } catch (error) {
      errorLog('Failed to notify label detected', error);
    }
  }

  /**
   * 清理资源
   */
  cleanup() {
    // 清理观察器
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    
    debugLog('Content script cleaned up');
  }
}

/**
 * 等待Gmail页面加载完成
 * @returns {Promise}
 */
function waitForGmailLoad() {
  return new Promise((resolve, reject) => {
    if (!isGmailPage()) {
      reject(new Error('Not a Gmail page'));
      return;
    }

    const checkGmailReady = () => {
      // 检查Gmail是否已加载
      if (document.querySelector('[role="main"]') || document.querySelector('.nH')) {
        resolve();
      } else {
        setTimeout(checkGmailReady, 100);
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkGmailReady);
    } else {
      checkGmailReady();
    }
  });
}

// 等待Gmail加载完成后初始化
waitForGmailLoad().then(() => {
  new ContentScript();
}).catch(error => {
  errorLog('Failed to initialize content script', error);
});