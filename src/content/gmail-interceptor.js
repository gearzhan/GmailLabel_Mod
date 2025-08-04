/**
 * Gmail API 拦截器
 * 拦截Gmail的API请求和响应，解析邮件和标签数据
 */

/**
 * Gmail API 拦截器类
 */
class GmailInterceptor {
  constructor() {
    this.isInitialized = false;
    this.originalFetch = null;
    this.originalXHR = null;
    this.labelCache = new Map();
    this.threadCache = new Map();
  }

  /**
   * 初始化拦截器
   */
  init() {
    if (this.isInitialized) {
      return;
    }

    try {
      this.setupFetchInterceptor();
      this.setupXHRInterceptor();
      
      this.isInitialized = true;
      debugLog('Gmail interceptor initialized');
    } catch (error) {
      errorLog('Failed to initialize Gmail interceptor', error);
    }
  }

  /**
   * 设置Fetch API拦截器
   */
  setupFetchInterceptor() {
    this.originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const [url, options] = args;
      
      // 记录所有fetch请求以便调试
      debugLog('Fetch request intercepted:', url);
      
      try {
        // 执行原始请求
        const response = await this.originalFetch.apply(window, args);
        
        // 检查是否为Gmail API请求
        if (this.isGmailApiRequest(url)) {
          // 克隆响应以便读取
          const clonedResponse = response.clone();
          
          // 异步处理响应数据
          this.processApiResponse(url, clonedResponse);
        }
        
        return response;
      } catch (error) {
        errorLog('Fetch interceptor error', error);
        throw error;
      }
    };
  }

  /**
   * 设置XMLHttpRequest拦截器
   */
  setupXHRInterceptor() {
    const self = this;
    this.originalXHR = window.XMLHttpRequest;
    
    window.XMLHttpRequest = function() {
      const xhr = new self.originalXHR();
      const originalOpen = xhr.open;
      const originalSend = xhr.send;
      
      let requestUrl = '';
      let requestData = null;
      
      // 拦截open方法
      xhr.open = function(method, url, ...args) {
        requestUrl = url;
        debugLog('XHR request opened:', url);
        return originalOpen.apply(this, [method, url, ...args]);
      };
      
      // 拦截send方法
      xhr.send = function(data) {
        requestData = data;
        debugLog('XHR request sent:', requestUrl);
        
        // 设置响应处理器
        const originalOnReadyStateChange = xhr.onreadystatechange;
        
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4 && xhr.status === 200) {
            debugLog('XHR response received:', requestUrl);
            // 检查是否为Gmail API请求
            if (self.isGmailApiRequest(requestUrl)) {
              self.processXHRResponse(requestUrl, xhr.responseText, requestData);
            }
          }
          
          if (originalOnReadyStateChange) {
            originalOnReadyStateChange.apply(this, arguments);
          }
        };
        
        return originalSend.apply(this, [data]);
      };
      
      return xhr;
    };
  }

  /**
   * 检查是否为Gmail API请求
   * @param {string} url - 请求URL
   * @returns {boolean} 是否为Gmail API请求
   */
  isGmailApiRequest(url) {
    if (!url || typeof url !== 'string') {
      return false;
    }

    // 调试：记录所有mail.google.com的请求
    if (url.includes('mail.google.com')) {
      debugLog('Gmail request detected', { url });
    }

    const gmailPatterns = [
      '/mail/u/',
      '/u/0/',
      '/api/',
      '/batch',
      'act=',
      'view=',
      'th=',
      'search=',
      '_/scs/mail-static/',
      'gmail.com/sync/',
      'gmail.com/mail/sync/',
      '/mail/sync/',
      'ik=',
      'at=',
      // 新增更多Gmail API模式
      '/mail/feed/',
      '/mail/channel/',
      'gmail.com/mail/u/',
      'service=mail',
      'f.req=',
      'reqid='
    ];

    return gmailPatterns.some(pattern => url.includes(pattern));
  }

  /**
   * 处理API响应数据
   * @param {string} url - 请求URL
   * @param {Response} response - 响应对象
   */
  async processApiResponse(url, response) {
    try {
      const text = await response.text();
      this.processResponseData(url, text);
    } catch (error) {
      errorLog('Failed to process API response', error);
    }
  }

  /**
   * 处理XHR响应数据
   * @param {string} url - 请求URL
   * @param {string} responseText - 响应文本
   * @param {any} requestData - 请求数据
   */
  processXHRResponse(url, responseText, requestData) {
    try {
      this.processResponseData(url, responseText, requestData);
    } catch (error) {
      errorLog('Failed to process XHR response', error);
    }
  }

  /**
   * 处理响应数据
   * @param {string} url - 请求URL
   * @param {string} responseText - 响应文本
   * @param {any} requestData - 请求数据（可选）
   */
  processResponseData(url, responseText, requestData = null) {
    try {
      debugLog('Processing response data for URL:', url);
      // 解析Gmail的特殊响应格式
      const data = this.parseGmailResponse(responseText);
      
      if (!data) {
        debugLog('No data parsed from response');
        return;
      }

      debugLog('Parsed data:', data);

      // 根据URL类型处理不同的数据
      if (url.includes('/sync/')) {
        debugLog('Processing sync data');
        this.processSyncData(data);
      } else if (url.includes('/label/')) {
        debugLog('Processing label data');
        this.processLabelData(data);
      } else if (url.includes('/thread/')) {
        debugLog('Processing thread data');
        this.processThreadData(data);
      } else if (url.includes('/message/')) {
        debugLog('Processing message data');
        this.processMessageData(data);
      }
    } catch (error) {
      errorLog('Failed to process response data', error);
    }
  }

  /**
   * 解析Gmail响应格式
   * @param {string} responseText - 响应文本
   * @returns {Object|null} 解析后的数据
   */
  parseGmailResponse(responseText) {
    try {
      // Gmail通常使用特殊的响应格式，可能需要去除前缀
      let cleanText = responseText;
      
      // 移除可能的安全前缀
      if (cleanText.startsWith(")]}'")) {
        cleanText = cleanText.substring(4);
      }
      
      // 尝试解析JSON
      return JSON.parse(cleanText);
    } catch (error) {
      // 如果不是JSON格式，尝试其他解析方法
      debugLog('Failed to parse as JSON, trying alternative parsing');
      return this.parseAlternativeFormat(responseText);
    }
  }

  /**
   * 解析替代格式
   * @param {string} responseText - 响应文本
   * @returns {Object|null} 解析后的数据
   */
  parseAlternativeFormat(responseText) {
    // 这里可以添加对Gmail其他响应格式的解析逻辑
    // 例如：数组格式、特殊编码格式等
    return null;
  }

  /**
   * 从响应中提取标签信息
   * @param {string} responseText - 响应文本
   * @returns {Array} 提取的标签数组
   */
  extractLabelsFromResponse(responseText) {
    const labels = [];
    
    try {
      // 尝试解析JSON响应
      if (responseText.startsWith('{') || responseText.startsWith('[')) {
        const data = JSON.parse(responseText);
        this.extractLabelsFromJSON(data, labels);
      } else if (responseText.includes(')]}\'\'')) {
        // 处理Gmail的XSSI保护响应格式
        const cleanResponse = responseText.substring(responseText.indexOf('{'));
        const data = JSON.parse(cleanResponse);
        this.extractLabelsFromJSON(data, labels);
      } else {
        // 处理其他格式的响应
        this.extractLabelsFromText(responseText, labels);
      }
    } catch (error) {
      debugLog('Error extracting labels from response', error);
      // 尝试文本提取作为备选方案
      this.extractLabelsFromText(responseText, labels);
    }
    
    // 去重并过滤系统标签
    const uniqueLabels = labels.filter((label, index, self) => 
      index === self.findIndex(l => l.id === label.id) &&
      !this.isSystemLabel(label.name)
    );
    
    if (uniqueLabels.length > 0) {
      debugLog(`Extracted ${uniqueLabels.length} unique labels from response`);
    }
    
    return uniqueLabels;
  }

  /**
   * 检查是否为系统标签
   * @param {string} labelName - 标签名称
   * @returns {boolean} 是否为系统标签
   */
  isSystemLabel(labelName) {
    const systemLabels = [
      'INBOX', 'SENT', 'DRAFT', 'SPAM', 'TRASH', 'STARRED',
      'IMPORTANT', 'UNREAD', 'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL',
      'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS'
    ];
    
    return systemLabels.includes(labelName?.toUpperCase());
  }

  /**
   * 从JSON数据中提取标签
   * @param {Object} data - JSON数据
   * @param {Array} labels - 标签数组
   */
  extractLabelsFromJSON(data, labels) {
    if (!data) return;
    
    // 递归搜索标签信息
    if (Array.isArray(data)) {
      data.forEach(item => this.extractLabelsFromJSON(item, labels));
    } else if (typeof data === 'object') {
      // 检查是否为标签对象
      if (data.id && data.name && typeof data.name === 'string') {
        labels.push({
          id: data.id,
          name: data.name,
          type: data.type || 'user'
        });
      }
      
      // 递归检查所有属性
      Object.values(data).forEach(value => {
        if (typeof value === 'object') {
          this.extractLabelsFromJSON(value, labels);
        }
      });
    }
  }

  /**
   * 从文本中提取标签
   * @param {string} text - 文本内容
   * @param {Array} labels - 标签数组
   */
  extractLabelsFromText(text, labels) {
    // 使用正则表达式匹配可能的标签模式
    const labelPatterns = [
      /"name"\s*:\s*"([^"]+)"/g,
      /"id"\s*:\s*"([^"]+)"/g,
      /label[_-]?name["']?\s*[:=]\s*["']([^"']+)["']/gi
    ];
    
    // 这里可以添加更复杂的文本解析逻辑
    debugLog('Attempting text-based label extraction from response');
  }

  /**
   * 处理同步数据
   * @param {Object} data - 同步数据
   */
  processSyncData(data) {
    debugLog('Processing sync data', data);
    
    // 提取标签信息
    if (data.labels) {
      this.extractLabels(data.labels);
    }
    
    // 提取线程信息
    if (data.threads) {
      this.extractThreads(data.threads);
    }
  }

  /**
   * 处理标签数据
   * @param {Object} data - 标签数据
   */
  processLabelData(data) {
    debugLog('Processing label data', data);
    this.extractLabels(data);
  }

  /**
   * 处理线程数据
   * @param {Object} data - 线程数据
   */
  processThreadData(data) {
    debugLog('Processing thread data', data);
    this.extractThreads(data);
  }

  /**
   * 处理消息数据
   * @param {Object} data - 消息数据
   */
  processMessageData(data) {
    debugLog('Processing message data', data);
    // 处理单个消息的标签信息
    if (data.labelIds) {
      this.processMessageLabels(data);
    }
  }

  /**
   * 提取标签信息
   * @param {Array|Object} labelsData - 标签数据
   */
  extractLabels(labelsData) {
    try {
      debugLog('Extracting labels from data:', labelsData);
      
      const labels = Array.isArray(labelsData) ? labelsData : [labelsData];
      
      debugLog('Processing labels array:', labels);
      
      for (const label of labels) {
        debugLog('Processing label:', label);
        
        if (label.id && label.name) {
          this.labelCache.set(label.id, {
            id: label.id,
            name: label.name,
            type: label.type || 'user',
            lastSeen: Date.now()
          });
          
          debugLog('Label extracted and cached', { id: label.id, name: label.name });
          
          // 通知后台脚本
          this.notifyLabelDetected(label.id, label.name);
        } else {
          debugLog('Label missing id or name:', label);
        }
      }
    } catch (error) {
      errorLog('Failed to extract labels', error);
    }
  }

  /**
   * 提取线程信息
   * @param {Array|Object} threadsData - 线程数据
   */
  extractThreads(threadsData) {
    try {
      const threads = Array.isArray(threadsData) ? threadsData : [threadsData];
      
      for (const thread of threads) {
        if (thread.id && thread.labelIds) {
          this.threadCache.set(thread.id, {
            id: thread.id,
            labelIds: thread.labelIds,
            lastSeen: Date.now()
          });
          
          debugLog('Thread extracted', { id: thread.id, labelIds: thread.labelIds });
        }
      }
    } catch (error) {
      errorLog('Failed to extract threads', error);
    }
  }

  /**
   * 处理消息标签
   * @param {Object} messageData - 消息数据
   */
  processMessageLabels(messageData) {
    try {
      if (messageData.labelIds && messageData.id) {
        debugLog('Message labels detected', {
          messageId: messageData.id,
          labelIds: messageData.labelIds
        });
        
        // 检查是否为回复消息
        if (this.isReplyMessage(messageData)) {
          this.handleReplyMessage(messageData);
        }
      }
    } catch (error) {
      errorLog('Failed to process message labels', error);
    }
  }

  /**
   * 检查是否为回复消息
   * @param {Object} messageData - 消息数据
   * @returns {boolean} 是否为回复消息
   */
  isReplyMessage(messageData) {
    // 这里可以添加更复杂的回复检测逻辑
    return messageData.threadId && messageData.inReplyTo;
  }

  /**
   * 处理回复消息
   * @param {Object} messageData - 回复消息数据
   */
  async handleReplyMessage(messageData) {
    try {
      debugLog('Reply message detected', messageData);
      
      // 获取原始线程的标签
      const threadLabels = this.getThreadLabels(messageData.threadId);
      
      if (threadLabels.length > 0) {
        // 通知内容脚本应用标签
        for (const labelId of threadLabels) {
          const labelInfo = this.labelCache.get(labelId);
          if (labelInfo) {
            await this.notifyLabelDetected(labelId, labelInfo.name, messageData.threadId, messageData.id);
          }
        }
      }
    } catch (error) {
      errorLog('Failed to handle reply message', error);
    }
  }

  /**
   * 获取线程标签
   * @param {string} threadId - 线程ID
   * @returns {Array} 标签ID数组
   */
  getThreadLabels(threadId) {
    const thread = this.threadCache.get(threadId);
    return thread ? thread.labelIds : [];
  }

  /**
   * 通知标签检测事件
   * @param {string} labelId - 标签ID
   * @param {string} labelName - 标签名称
   * @param {string} threadId - 线程ID（可选）
   * @param {string} messageId - 消息ID（可选）
   */
  async notifyLabelDetected(labelId, labelName, threadId = null, messageId = null) {
    try {
      await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.LABEL_DETECTED,
        data: {
          labelId,
          labelName,
          threadId,
          messageId,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      errorLog('Failed to notify label detected', error);
    }
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 缓存统计
   */
  getCacheStats() {
    return {
      labels: this.labelCache.size,
      threads: this.threadCache.size
    };
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.labelCache.clear();
    this.threadCache.clear();
    debugLog('Cache cleared');
  }

  /**
   * 恢复原始API
   */
  restore() {
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
    }
    
    if (this.originalXHR) {
      window.XMLHttpRequest = this.originalXHR;
    }
    
    this.isInitialized = false;
    debugLog('Gmail interceptor restored');
  }
}

// 创建全局实例
window.gmailInterceptor = new GmailInterceptor();

// 导出类（用于测试）
// export { GmailInterceptor };