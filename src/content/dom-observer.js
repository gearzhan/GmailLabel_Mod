/**
 * DOM 观察器模块
 * 监控Gmail界面变化，检测新邮件加载和用户交互事件
 */

/**
 * DOM 观察器类
 */
class DOMObserver {
  constructor() {
    this.observers = [];
    this.isInitialized = false;
    this.composeObserver = null;
    this.labelObserver = null;
    this.threadObserver = null;
    this.sidebarObserver = null;
    
    // 防抖和节流函数
    this.debouncedLabelUpdate = debounce(this.updateLabelDisplay.bind(this), 300);
    this.throttledComposeCheck = throttle(this.checkComposeWindows.bind(this), 500);
  }

  /**
   * 初始化DOM观察器
   */
  init() {
    if (this.isInitialized) {
      return;
    }

    try {
      this.setupEmailObserver();
      this.setupComposeObserver();
      this.setupThreadObserver();
      this.setupGlobalObserver();
      
      this.isInitialized = true;
      debugLog('DOM observer initialized');
    } catch (error) {
      errorLog('Failed to initialize DOM observer', error);
    }
  }

  /**
   * 设置邮件观察器
   * 监控邮件列表和邮件内容的变化
   */
  setupEmailObserver() {
    try {
      // 观察邮件列表区域
      const emailListContainer = document.querySelector('[role="main"] [gh="tl"], [role="main"] .AO');
      if (emailListContainer) {
        this.emailListObserver = new MutationObserver(this.throttle((mutations) => {
          mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  this.processEmailElement(node);
                }
              });
            }
          });
        }, 200));

        this.emailListObserver.observe(emailListContainer, {
          childList: true,
          subtree: true
        });

        this.observers.push(this.emailListObserver);
        debugLog('Email list observer setup complete');
      }

      // 观察邮件内容区域
      const emailContentContainer = document.querySelector('[role="main"] .nH.if');
      if (emailContentContainer) {
        this.emailContentObserver = new MutationObserver(this.throttle((mutations) => {
          mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  this.processEmailContentElement(node);
                }
              });
            }
          });
        }, 200));

        this.emailContentObserver.observe(emailContentContainer, {
          childList: true,
          subtree: true
        });

        this.observers.push(this.emailContentObserver);
        debugLog('Email content observer setup complete');
      }
    } catch (error) {
      errorLog('Failed to setup email observer', error);
    }
  }

  /**
   * 处理邮件元素
   * @param {Element} element - 邮件元素
   */
  processEmailElement(element) {
    try {
      // 查找邮件行中的标签
      const labelElements = element.querySelectorAll('.ar .at, [data-legacy-label-id]');
      
      labelElements.forEach(labelEl => {
        const labelText = labelEl.textContent?.trim();
        const labelId = labelEl.getAttribute('data-legacy-label-id') || 
                       labelText?.toLowerCase().replace(/\s+/g, '_');
        
        if (labelId && labelText && !this.labelCache?.has(labelId)) {
          if (!this.labelCache) {
            this.labelCache = new Map();
          }
          
          this.labelCache.set(labelId, {
            id: labelId,
            text: labelText,
            element: labelEl,
            timestamp: Date.now()
          });
          
          debugLog('Email label detected', { labelId, labelText });
        }
      });
    } catch (error) {
      errorLog('Error processing email element', error);
    }
  }

  /**
   * 处理邮件内容元素
   * @param {Element} element - 邮件内容元素
   */
  processEmailContentElement(element) {
    try {
      // 查找邮件内容中的标签显示
      const labelElements = element.querySelectorAll('.hA .hN, [data-legacy-label-id]');
      
      labelElements.forEach(labelEl => {
        const labelText = labelEl.textContent?.trim();
        const labelId = labelEl.getAttribute('data-legacy-label-id') || 
                       labelText?.toLowerCase().replace(/\s+/g, '_');
        
        if (labelId && labelText) {
          debugLog('Email content label detected', { labelId, labelText });
          
          // 检查是否是回复邮件场景
          const isReplyContext = element.closest('.ii.gt') || 
                                element.querySelector('[data-action="reply"], [data-action="replyall"]');
          
          if (isReplyContext) {
            debugLog('Reply context detected with label', { labelId, labelText });
            // 这里可以触发自动标签应用逻辑
          }
        }
      });
    } catch (error) {
      errorLog('Error processing email content element', error);
    }
  }

  /**
   * 设置撰写邮件观察器
   */
  setupComposeObserver() {
    try {
      // 观察撰写邮件窗口的出现
      this.composeObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                // 检查是否为撰写窗口
                if (this.isComposeWindow(node)) {
                  this.handleComposeWindowAdded(node);
                } else {
                  // 检查子元素中是否有撰写窗口
                  const composeWindows = node.querySelectorAll?.(SELECTORS.COMPOSE_WINDOW);
                  if (composeWindows) {
                    composeWindows.forEach(window => this.handleComposeWindowAdded(window));
                  }
                }
              }
            }
          }
        }
      });
      
      this.composeObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      this.observers.push(this.composeObserver);
      debugLog('Compose observer setup complete');
    } catch (error) {
      errorLog('Failed to setup compose observer', error);
    }
  }

  /**
   * 设置线程观察器
   */
  setupThreadObserver() {
    try {
      // 观察邮件线程的变化
      const mainContent = document.querySelector('[role="main"]');
      
      if (mainContent) {
        this.threadObserver = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (mutation.type === 'childList') {
              for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE && 
                    node.hasAttribute?.('data-legacy-thread-id')) {
                  this.handleThreadAdded(node);
                }
              }
            }
          }
        });
        
        this.threadObserver.observe(mainContent, {
          childList: true,
          subtree: true
        });
        
        this.observers.push(this.threadObserver);
        debugLog('Thread observer setup complete');
      }
    } catch (error) {
      errorLog('Failed to setup thread observer', error);
    }
  }

  /**
   * 设置全局观察器
   */
  setupGlobalObserver() {
    try {
      // 定期检查撰写窗口（作为备用机制）
      setInterval(() => {
        this.throttledComposeCheck();
      }, 2000);
      
      // 监听页面可见性变化
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          // 页面重新可见时，更新标签显示
          setTimeout(() => {
            this.updateLabelDisplay();
          }, 500);
        }
      });
      
      debugLog('Global observer setup complete');
    } catch (error) {
      errorLog('Failed to setup global observer', error);
    }
  }

  /**
   * 检查元素是否为撰写窗口
   * @param {Element} element - 要检查的元素
   * @returns {boolean} 是否为撰写窗口
   */
  isComposeWindow(element) {
    return element.matches?.(SELECTORS.COMPOSE_WINDOW) ||
           element.querySelector?.(SELECTORS.COMPOSE_WINDOW) !== null;
  }

  /**
   * 处理撰写窗口添加事件
   * @param {Element} composeWindow - 撰写窗口元素
   */
  handleComposeWindowAdded(composeWindow) {
    try {
      debugLog('Compose window detected', composeWindow);
      
      // 检查是否为回复窗口
      if (this.isReplyWindow(composeWindow)) {
        this.handleReplyWindow(composeWindow);
      }
      
      // 设置撰写窗口的观察器
      this.setupComposeWindowObserver(composeWindow);
    } catch (error) {
      errorLog('Failed to handle compose window', error);
    }
  }

  /**
   * 检查是否为回复窗口
   * @param {Element} composeWindow - 撰写窗口元素
   * @returns {boolean} 是否为回复窗口
   */
  isReplyWindow(composeWindow) {
    // 检查是否包含回复相关的标识
    return composeWindow.querySelector('[data-legacy-thread-id]') !== null ||
           composeWindow.closest('[data-legacy-thread-id]') !== null ||
           composeWindow.querySelector('[name="in_reply_to"]') !== null;
  }

  /**
   * 处理回复窗口
   * @param {Element} replyWindow - 回复窗口元素
   */
  async handleReplyWindow(replyWindow) {
    try {
      debugLog('Reply window detected', replyWindow);
      
      // 获取原始邮件的标签信息
      const labelInfo = this.extractReplyLabels(replyWindow);
      
      if (labelInfo && labelInfo.labels.length > 0) {
        debugLog('Reply labels detected', labelInfo);
        
        // 通知内容脚本处理标签应用
        if (window.contentScript) {
          await window.contentScript.autoApplyLabels(labelInfo.labels, labelInfo.threadId);
        }
      }
    } catch (error) {
      errorLog('Failed to handle reply window', error);
    }
  }

  /**
   * 提取回复邮件的标签信息
   * @param {Element} replyWindow - 回复窗口元素
   * @returns {Object|null} 标签信息
   */
  extractReplyLabels(replyWindow) {
    try {
      // 查找线程容器
      const threadContainer = replyWindow.closest('[data-legacy-thread-id]') ||
                             document.querySelector('[data-legacy-thread-id]');
      
      if (!threadContainer) {
        return null;
      }
      
      const threadId = threadContainer.getAttribute('data-legacy-thread-id');
      
      // 查找标签元素
      const labelElements = threadContainer.querySelectorAll('[data-legacy-label-id]');
      
      const labels = Array.from(labelElements)
        .map(element => ({
          id: element.getAttribute('data-legacy-label-id'),
          name: element.textContent?.trim() || ''
        }))
        .filter(label => label.id && label.name);
      
      return {
        threadId,
        labels
      };
    } catch (error) {
      errorLog('Failed to extract reply labels', error);
      return null;
    }
  }

  /**
   * 设置撰写窗口观察器
   * @param {Element} composeWindow - 撰写窗口元素
   */
  setupComposeWindowObserver(composeWindow) {
    try {
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          // 监听发送按钮点击等事件
          if (mutation.type === 'attributes' && 
              mutation.attributeName === 'aria-disabled') {
            this.handleComposeSend(composeWindow);
          }
        }
      });
      
      // 查找发送按钮
      const sendButton = composeWindow.querySelector('[data-tooltip="Send"]');
      if (sendButton) {
        observer.observe(sendButton, {
          attributes: true,
          attributeFilter: ['aria-disabled', 'disabled']
        });
        
        this.observers.push(observer);
      }
    } catch (error) {
      errorLog('Failed to setup compose window observer', error);
    }
  }

  /**
   * 处理邮件发送事件
   * @param {Element} composeWindow - 撰写窗口元素
   */
  handleComposeSend(composeWindow) {
    try {
      debugLog('Compose send detected', composeWindow);
      
      // 这里可以添加发送后的处理逻辑
      // 例如：确认标签已正确应用
    } catch (error) {
      errorLog('Failed to handle compose send', error);
    }
  }

  /**
   * 处理线程添加事件
   * @param {Element} threadElement - 线程元素
   */
  handleThreadAdded(threadElement) {
    try {
      const threadId = threadElement.getAttribute('data-legacy-thread-id');
      debugLog('Thread added', { threadId });
      
      // 更新该线程的标签显示
      this.updateThreadLabels(threadElement);
    } catch (error) {
      errorLog('Failed to handle thread added', error);
    }
  }

  /**
   * 更新线程标签显示
   * @param {Element} threadElement - 线程元素
   */
  updateThreadLabels(threadElement) {
    try {
      const labelElements = threadElement.querySelectorAll('[data-legacy-label-id]');
      
      for (const labelElement of labelElements) {
        this.updateLabelElement(labelElement);
      }
    } catch (error) {
      errorLog('Failed to update thread labels', error);
    }
  }

  /**
   * 更新标签元素显示
   * @param {Element} labelElement - 标签元素
   */
  async updateLabelElement(labelElement) {
    try {
      const labelId = labelElement.getAttribute('data-legacy-label-id');
      
      if (!labelId || labelElement.hasAttribute('data-custom-updated')) {
        return;
      }
      
      // 获取自定义标签名称
      if (window.contentScript && window.contentScript.settings) {
        const customName = window.contentScript.settings.customLabelNames?.[labelId];
        
        if (customName && labelElement.textContent !== customName) {
          labelElement.textContent = customName;
          labelElement.setAttribute('data-custom-updated', 'true');
          debugLog(`Updated label ${labelId} to custom name: ${customName}`);
        }
      }
    } catch (error) {
      errorLog('Failed to update label element', error);
    }
  }

  /**
   * 更新标签显示
   */
  updateLabelDisplay() {
    try {
      debugLog('Updating label display');
      
      // 查找所有标签元素
      const labelElements = document.querySelectorAll('[data-legacy-label-id]');
      
      for (const labelElement of labelElements) {
        this.updateLabelElement(labelElement);
      }
    } catch (error) {
      errorLog('Failed to update label display', error);
    }
  }

  /**
   * 检查撰写窗口
   */
  checkComposeWindows() {
    try {
      const composeWindows = document.querySelectorAll(SELECTORS.COMPOSE_WINDOW);
      
      for (const window of composeWindows) {
        if (!window.hasAttribute('data-observer-attached')) {
          this.handleComposeWindowAdded(window);
          window.setAttribute('data-observer-attached', 'true');
        }
      }
    } catch (error) {
      errorLog('Failed to check compose windows', error);
    }
  }

  /**
   * 获取观察器统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      observersCount: this.observers.length,
      isInitialized: this.isInitialized
    };
  }

  /**
   * 清理所有观察器
   */
  cleanup() {
    try {
      this.observers.forEach(observer => {
        if (observer && typeof observer.disconnect === 'function') {
          observer.disconnect();
        }
      });
      
      this.observers = [];
      this.isInitialized = false;
      
      debugLog('DOM observer cleaned up');
    } catch (error) {
      errorLog('Failed to cleanup DOM observer', error);
    }
  }
}

// 创建全局实例
window.domObserver = new DOMObserver();

// 导出类（用于测试）
// export { DOMObserver };