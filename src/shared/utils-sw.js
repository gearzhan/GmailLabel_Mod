/**
 * Service Worker工具函数集合
 * 提供Service Worker环境中使用的通用工具函数
 */

/**
 * 调试日志输出
 * @param {string} message - 日志消息
 * @param {any} data - 附加数据
 */
function debugLog(message, data = null) {
  if (typeof DEBUG !== 'undefined' && DEBUG) {
    console.log(`[Gmail Label Manager] ${message}`, data);
  }
}

/**
 * 错误日志输出
 * @param {string} message - 错误消息
 * @param {Error} error - 错误对象
 */
function errorLog(message, error = null) {
  console.error(`[Gmail Label Manager Error] ${message}`, error);
}

/**
 * 延迟执行函数
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise} Promise对象
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间
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
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 限制时间
 * @returns {Function} 节流后的函数
 */
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 生成唯一ID
 * @returns {string} 唯一ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 深度克隆对象
 * @param {any} obj - 要克隆的对象
 * @returns {any} 克隆后的对象
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }
  
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

/**
 * 检查是否为系统标签
 * @param {string} labelText - 标签文本
 * @returns {boolean} 是否为系统标签
 */
function isSystemLabel(labelText) {
  const systemLabels = [
    // 英文系统标签
    'Inbox', 'Sent', 'Drafts', 'Spam', 'Trash', 'All Mail',
    'Starred', 'Important', 'Snoozed', 'Scheduled',
    // 中文系统标签
    '收件箱', '已发送', '草稿', '垃圾邮件', '已删除', '所有邮件',
    '已加星标', '重要', '已暂停', '已安排发送'
  ];
  
  return systemLabels.includes(labelText);
}