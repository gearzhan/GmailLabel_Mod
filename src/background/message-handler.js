/**
 * 消息处理模块
 * 处理扩展内部的消息通信
 */

/**
 * 消息处理器类
 */
class MessageHandler {
  constructor() {
    this.handlers = new Map();
    this.setupHandlers();
  }

  /**
   * 设置消息处理器
   */
  setupHandlers() {
    // 标签相关处理器
    this.handlers.set(MESSAGE_TYPES.LABEL_DETECTED, this.handleLabelDetected.bind(this));
    this.handlers.set(MESSAGE_TYPES.LABEL_APPLIED, this.handleLabelApplied.bind(this));
    
    // 设置相关处理器
    this.handlers.set(MESSAGE_TYPES.SETTINGS_UPDATED, this.handleSettingsUpdated.bind(this));
    
    // 缓存相关处理器
    this.handlers.set(MESSAGE_TYPES.CACHE_UPDATED, this.handleCacheUpdated.bind(this));
    
    // 调试处理器
    this.handlers.set('ping', this.handlePing.bind(this));
  }

  /**
   * 处理消息
   * @param {Object} message - 消息对象
   * @param {Object} sender - 发送者信息
   * @returns {Promise<Object>} 处理结果
   */
  async handleMessage(message, sender) {
    try {
      const handler = this.handlers.get(message.type);
      
      if (!handler) {
        throw new Error(`No handler found for message type: ${message.type}`);
      }

      debugLog(`Handling message: ${message.type}`, message.data);
      
      const result = await handler(message.data, sender);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      errorLog(`Error handling message: ${message.type}`, error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 处理标签检测消息
   * @param {Object} data - 标签数据
   * @param {Object} sender - 发送者信息
   * @returns {Promise<Object>} 处理结果
   */
  async handleLabelDetected(data, sender) {
    try {
      console.log('Label detected:', data);
      
      // 验证标签数据
      if (!data.labelId || !data.labelName) {
        throw new Error('Invalid label data: missing labelId or labelName');
      }
      
      const { labelId, labelName, threadId, messageId } = data;
      
      // 更新标签缓存
      await storage.updateLabelCache({
        [labelId]: {
          id: labelId,
          name: labelName,
          lastSeen: Date.now(),
          threadIds: [threadId]
        }
      });
      
      // 检查是否需要应用自定义名称
      const customName = await this.getCustomLabelName(labelId);
      if (customName) {
        console.log(`Custom name found for label ${labelId}: ${customName}`);
      }
      
      // 获取用户设置
      const settings = await storage.getUserSettings();
      
      // 如果启用了自动应用标签功能
      if (settings.autoApplyLabels) {
        return {
          action: 'auto_apply',
          labelId,
          labelName,
          customName: customName
        };
      }
      
      return {
        action: 'prompt_user',
        labelId,
        labelName,
        customName: customName
      };
    } catch (error) {
      console.error('Failed to handle label detected:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取自定义标签名称
   * @param {string} labelId - 标签ID
   * @returns {string|null} 自定义名称
   */
  async getCustomLabelName(labelId) {
    try {
      const result = await chrome.storage.sync.get(['customLabelNames']);
      const customNames = result.customLabelNames || {};
      return customNames[labelId] || null;
    } catch (error) {
      console.error('Failed to get custom label name:', error);
      return null;
    }
  }

  /**
   * 处理标签应用消息
   * @param {Object} data - 标签应用数据
   * @param {Object} sender - 发送者信息
   * @returns {Promise<Object>} 处理结果
   */
  async handleLabelApplied(data, sender) {
    const { labelId, threadId, success } = data;
    
    debugLog('Label applied', { labelId, threadId, success });
    
    if (success) {
      // 记录成功应用的标签
      const cache = await storage.getLabelCache();
      if (cache[labelId]) {
        cache[labelId].appliedCount = (cache[labelId].appliedCount || 0) + 1;
        cache[labelId].lastApplied = Date.now();
        await storage.updateLabelCache({ [labelId]: cache[labelId] });
      }
    }
    
    return { recorded: true };
  }

  /**
   * 处理设置更新消息
   * @param {Object} data - 设置数据
   * @param {Object} sender - 发送者信息
   * @returns {Promise<Object>} 处理结果
   */
  async handleSettingsUpdated(data, sender) {
    debugLog('Settings update requested', data);
    
    // 更新设置
    const success = await storage.updateUserSettings(data);
    
    if (success) {
      // 通知所有Gmail标签页设置已更新
      this.broadcastSettingsUpdate(data);
    }
    
    return { updated: success };
  }

  /**
   * 处理缓存更新消息
   * @param {Object} data - 缓存数据
   * @param {Object} sender - 发送者信息
   * @returns {Promise<Object>} 处理结果
   */
  async handleCacheUpdated(data, sender) {
    debugLog('Cache update requested', data);
    
    const success = await storage.updateLabelCache(data);
    
    return { updated: success };
  }

  /**
   * 广播设置更新到所有Gmail标签页
   * @param {Object} settings - 更新的设置
   */
  async broadcastSettingsUpdate(settings) {
    try {
      const tabs = await chrome.tabs.query({ url: 'https://mail.google.com/*' });
      
      const message = {
        type: MESSAGE_TYPES.SETTINGS_UPDATED,
        data: settings
      };
      
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, message).catch(error => {
          debugLog('Failed to broadcast settings to tab', { tabId: tab.id, error: error.message });
        });
      }
    } catch (error) {
      errorLog('Failed to broadcast settings update', error);
    }
  }

  /**
   * 发送消息到指定标签页
   * @param {number} tabId - 标签页ID
   * @param {Object} message - 消息对象
   * @returns {Promise<Object>} 响应结果
   */
  async sendMessageToTab(tabId, message) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, message);
      return response;
    } catch (error) {
      errorLog('Failed to send message to tab', { tabId, error });
      throw error;
    }
  }

  /**
   * 处理ping消息（用于调试）
   * @returns {Object} pong响应
   */
  async handlePing() {
    return {
      message: 'pong',
      timestamp: Date.now(),
      extensionActive: true
    };
  }

  /**
   * 获取消息处理统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      handlersCount: this.handlers.size,
      handlerTypes: Array.from(this.handlers.keys())
    };
  }
}