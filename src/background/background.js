/**
 * 后台服务工作者
 * 处理扩展的核心逻辑和消息通信
 */

// 导入依赖文件
importScripts('src/shared/constants.js');
importScripts('src/shared/utils-sw.js');
importScripts('src/shared/storage.js');
importScripts('src/background/message-handler.js');

class BackgroundService {
  constructor() {
    this.messageHandler = new MessageHandler();
    this.isInitialized = false;
    this.labelCache = new Map();
    this.activeTabId = null;
  }

  /**
   * 初始化后台服务
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // 设置消息监听器
      this.setupMessageListeners();
      
      // 设置扩展事件监听器
      this.setupExtensionListeners();
      
      // 设置标签页监听器
      this.setupTabListeners();
      
      this.isInitialized = true;
      console.log('Gmail Label Extension: Background service initialized');
    } catch (error) {
      console.error('Gmail Label Extension: Failed to initialize background service', error);
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
   * 设置扩展事件监听器
   */
  setupExtensionListeners() {
    // 扩展安装/更新事件
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstalled(details);
    });

    // 扩展启动事件
    chrome.runtime.onStartup.addListener(() => {
      debugLog('Extension startup');
    });
  }

  /**
   * 设置标签页监听器
   */
  setupTabListeners() {
    // 监听标签页激活
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.activeTabId = activeInfo.tabId;
      this.checkIfGmailTab(activeInfo.tabId);
    });

    // 监听标签页更新
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url?.includes('mail.google.com')) {
        console.log('Gmail tab loaded:', tabId);
        this.activeTabId = tabId;
      }
    });
  }

  /**
   * 检查是否为Gmail标签页
   * @param {number} tabId - 标签页ID
   */
  async checkIfGmailTab(tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.url?.includes('mail.google.com')) {
        console.log('Active Gmail tab detected:', tabId);
        this.activeTabId = tabId;
      }
    } catch (error) {
      // 标签页可能已关闭，忽略错误
    }
  }

  /**
   * 处理消息
   * @param {Object} message - 消息对象
   * @param {Object} sender - 发送者信息
   * @param {Function} sendResponse - 响应函数
   */
  async handleMessage(message, sender, sendResponse) {
    try {
      debugLog('Received message', { type: message.type, data: message.data });

      switch (message.type) {
        case MESSAGE_TYPES.LABEL_DETECTED:
          await this.handleLabelDetected(message.data);
          sendResponse({ success: true });
          break;

        case MESSAGE_TYPES.SETTINGS_UPDATED:
          await this.handleSettingsUpdated(message.data);
          sendResponse({ success: true });
          break;

        case MESSAGE_TYPES.CACHE_UPDATED:
          await this.handleCacheUpdated(message.data);
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
   * 处理扩展安装/更新事件
   * @param {Object} details - 安装详情
   */
  async handleInstalled(details) {
    debugLog('Extension installed/updated', details);

    if (details.reason === 'install') {
      // 首次安装，初始化默认设置
      await this.initializeDefaultSettings();
      debugLog('Default settings initialized');
    } else if (details.reason === 'update') {
      // 更新，可能需要迁移数据
      await this.migrateSettings(details.previousVersion);
      debugLog('Settings migrated from version', details.previousVersion);
    }
  }

  /**
   * 处理标签检测事件
   * @param {Object} data - 标签数据
   */
  async handleLabelDetected(data) {
    debugLog('Label detected', data);
    
    // 更新标签缓存
    await storage.updateLabelCache({
      [data.labelId]: {
        name: data.labelName,
        lastSeen: Date.now()
      }
    });

    // 通知所有标签页
    this.broadcastToTabs({
      type: MESSAGE_TYPES.LABEL_APPLIED,
      data: data
    });
  }

  /**
   * 处理设置更新事件
   * @param {Object} data - 设置数据
   */
  async handleSettingsUpdated(data) {
    debugLog('Settings updated', data);
    
    // 通知所有标签页设置已更新
    this.broadcastToTabs({
      type: MESSAGE_TYPES.SETTINGS_UPDATED,
      data: data
    });
  }

  /**
   * 处理缓存更新事件
   * @param {Object} data - 缓存数据
   */
  async handleCacheUpdated(data) {
    debugLog('Cache updated', data);
    await storage.updateLabelCache(data);
  }

  /**
   * 初始化设置
   */
  async initializeSettings() {
    const settings = await storage.getUserSettings();
    debugLog('Current settings loaded', settings);
  }

  /**
   * 初始化默认设置
   */
  async initializeDefaultSettings() {
    const defaultSettings = {
      autoApplyLabels: true,
      showNotifications: true,
      customLabelNames: {},
      labelOrder: []
    };
    
    await storage.updateUserSettings(defaultSettings);
  }

  /**
   * 迁移设置（版本更新时）
   * @param {string} previousVersion - 之前的版本号
   */
  async migrateSettings(previousVersion) {
    // 根据版本号进行数据迁移
    debugLog('Migrating settings from version', previousVersion);
    // 这里可以添加具体的迁移逻辑
  }

  /**
   * 向所有Gmail标签页广播消息
   * @param {Object} message - 要广播的消息
   */
  async broadcastToTabs(message) {
    try {
      const tabs = await chrome.tabs.query({ url: 'https://mail.google.com/*' });
      
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, message).catch(error => {
          // 忽略无法发送消息的标签页（可能已关闭或未加载内容脚本）
          debugLog('Failed to send message to tab', { tabId: tab.id, error: error.message });
        });
      }
    } catch (error) {
      errorLog('Failed to broadcast message to tabs', error);
    }
  }
}

// 初始化后台服务
const backgroundService = new BackgroundService();
backgroundService.initialize();

// 导出服务实例（用于测试）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = backgroundService;
}