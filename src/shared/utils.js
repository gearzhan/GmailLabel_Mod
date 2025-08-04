/**
 * 工具函数集合
 * 提供扩展中使用的通用工具函数
 */

/**
 * 调试日志输出
 * @param {string} message - 日志消息
 * @param {any} data - 附加数据
 */
function debugLog(message, data = null) {
  if (DEBUG) {
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
 * @param {number} limit - 时间限制
 * @returns {Function} 节流后的函数
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 生成唯一ID
 * @returns {string} 唯一标识符
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 深拷贝对象
 * @param {any} obj - 要拷贝的对象
 * @returns {any} 拷贝后的对象
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
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
 * 检查是否为Gmail页面
 * @returns {boolean} 是否为Gmail页面
 */
function isGmailPage() {
  return window.location.hostname === 'mail.google.com';
}

/**
 * 等待指定元素出现
 * @param {string} selector - CSS选择器
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<Element|null>} 找到的元素或null
 */
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver((mutations, obs) => {
      const element = document.querySelector(selector);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

/**
 * 等待Gmail侧边栏加载完成
 * @param {string} selector - 侧边栏选择器
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<Element|null>} 侧边栏元素或null
 */
function waitForGmailSidebar(selector = 'div[role="navigation"]', timeout = 15000) {
  return new Promise(resolve => {
    const start = Date.now();
    const checkInterval = 300;
    
    const checkForSidebar = () => {
      const sidebar = document.querySelector(selector);
      if (sidebar) {
        debugLog('Gmail sidebar found', sidebar);
        resolve(sidebar);
        return;
      }
      
      if (Date.now() - start > timeout) {
        errorLog('Gmail sidebar timeout after ' + timeout + 'ms');
        resolve(null);
        return;
      }
      
      setTimeout(checkForSidebar, checkInterval);
    };
    
    checkForSidebar();
  });
}

/**
 * 获取Gmail侧边栏中的所有标签
 * @param {Element} sidebar - 侧边栏元素
 * @returns {Array} 标签数组
 */
function extractLabelsFromSidebar(sidebar) {
  const labels = [];
  
  if (!sidebar) {
    debugLog('No sidebar provided for label extraction');
    return labels;
  }
  
  // 尝试多种选择器来获取标签
  const selectors = [
    'a[title]',
    'a[aria-label]', 
    'a[data-tooltip]',
    'span[title]',
    '.aim .aZ6'
  ];
  
  selectors.forEach(selector => {
    const elements = sidebar.querySelectorAll(selector);
    elements.forEach(element => {
      const labelText = element.title || 
                       element.getAttribute('aria-label') || 
                       element.dataset.tooltip ||
                       element.textContent?.trim();
      
      if (labelText && labelText.length > 0) {
        // 过滤掉系统标签和非标签元素
        if (!isSystemLabel(labelText)) {
          labels.push({
            element: element,
            text: labelText,
            selector: selector
          });
        }
      }
    });
  });
  
  debugLog('Extracted labels from sidebar:', labels.map(l => l.text));
  return labels;
}

/**
 * 检查是否为系统标签
 * @param {string} labelText - 标签文本
 * @returns {boolean} 是否为系统标签
 */
function isSystemLabel(labelText) {
  const systemLabels = [
    'Inbox', 'Sent', 'Drafts', 'Spam', 'Trash', 'All Mail',
    '收件箱', '已发送', '草稿', '垃圾邮件', '已删除', '所有邮件',
    'Starred', 'Important', 'Snoozed', 'Scheduled',
    '已加星标', '重要', '已暂停', '已安排发送'
  ];
  
  return systemLabels.some(sys => 
    labelText.toLowerCase().includes(sys.toLowerCase())
  );
}