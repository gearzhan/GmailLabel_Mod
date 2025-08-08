// Gmail标签管理器 - 内容脚本
// 注入Gmail页面实现DOM操作和标签管理功能

/**
 * 全局变量和配置
 */
let extensionConfig = null;
let isGmailLoaded = false;
let labelObserver = null;

/**
 * 初始化函数 - 页面加载完成后执行
 */
function initializeExtension() {
  console.log('Gmail Label Manager: Initializing...');
  
  // 检查是否在Gmail页面
  if (!window.location.href.includes('mail.google.com')) {
    console.log('Not on Gmail page, extension will not activate');
    return;
  }
  
  // 等待Gmail界面加载完成
  waitForGmailLoad();
}

/**
 * 等待Gmail界面完全加载
 */
function waitForGmailLoad() {
  const checkGmailLoad = () => {
    // 检查Gmail的主要容器是否存在
    const gmailContainer = document.querySelector('[role="main"]') || 
                          document.querySelector('.nH') ||
                          document.querySelector('#\\:1');
    
    if (gmailContainer && !isGmailLoaded) {
      isGmailLoaded = true;
      console.log('Gmail interface loaded');
      setupExtension();
    } else if (!isGmailLoaded) {
      // 如果Gmail还未加载，继续等待
      setTimeout(checkGmailLoad, 1000);
    }
  };
  
  checkGmailLoad();
}

/**
 * 设置扩展功能
 */
async function setupExtension() {
  try {
    // 获取扩展配置
    await loadExtensionConfig();
    
    // 设置标签监听器
    setupLabelObserver();
    
    // 设置回复邮件监听器
    setupReplyObserver();
    
    // 设置回复检测功能
    setupReplyDetection();
    
    // 初始化标签拖拽功能（如果启用）
    if (extensionConfig?.userConfig?.enableDragAndDrop) {
      initializeLabelDragAndDrop();
    }
    
    // 延迟执行标签检测测试
    setTimeout(() => {
      testLabelDetection();
    }, 3000);
    
    console.log('Gmail Label Manager: Setup completed');
    console.log('功能包括: 标签检测、回复监听、标签关联检测');
    
  } catch (error) {
    console.error('Error setting up extension:', error);
  }
}

/**
 * 检测邮件回复操作
 */
function detectReplyAction() {
  // 查找回复按钮和回复框的选择器
  const replySelectors = [
    // 回复按钮
    '[data-tooltip="回复"]',
    '[data-tooltip="Reply"]',
    '.T-I.J-J5-Ji.T-I-Js-Gs.aaq.T-I-ax7.L3', // 回复按钮
    // 回复框
    '.Am.Al.editable',
    '.editable[contenteditable="true"]',
    // 撰写窗口
    '.M9[role="dialog"]',
    '.inboxsdk__compose',
    // 回复区域
    '.nr.tMHS5d',
    '.gA .nr'
  ];
  
  let isReplying = false;
  
  replySelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      isReplying = true;
    }
  });
  
  return isReplying;
}

/**
 * 监听回复操作
 */
function setupReplyDetection() {
  // 监听回复按钮点击
  document.addEventListener('click', function(event) {
    const target = event.target;
    
    // 检查是否点击了回复相关按钮
    const replyButtonSelectors = [
      '[data-tooltip="回复"]',
      '[data-tooltip="Reply"]',
      '.T-I.J-J5-Ji.T-I-Js-Gs.aaq.T-I-ax7.L3'
    ];
    
    let isReplyButton = false;
    replyButtonSelectors.forEach(selector => {
      if (target.matches(selector) || target.closest(selector)) {
        isReplyButton = true;
      }
    });
    
    if (isReplyButton) {
      console.log('检测到回复操作');
      
      // 延迟检测原邮件标签，等待DOM更新
      setTimeout(() => {
        const originalLabels = detectOriginalEmailLabels();
        console.log('原邮件标签:', originalLabels);
        
        if (originalLabels.length > 0) {
          // 触发标签应用逻辑
          handleReplyWithLabels(originalLabels);
        }
      }, 1000);
    }
  });
  
  // 监听DOM变化，检测回复框出现
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        // 检查是否有新的回复框出现
        const replyBoxes = document.querySelectorAll('.Am.Al.editable, .editable[contenteditable="true"]');
        if (replyBoxes.length > 0) {
          console.log('检测到回复框出现');
          
          // 检测原邮件标签
          const originalLabels = detectOriginalEmailLabels();
          if (originalLabels.length > 0) {
            handleReplyWithLabels(originalLabels);
          }
        }
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * 处理回复邮件的标签应用
 */
function handleReplyWithLabels(originalLabels) {
  console.log('处理回复邮件标签应用:', originalLabels);
  
  // 保存原邮件标签到全局对象
  window.gmailLabelManager.pendingLabels = originalLabels;
  
  // 这里可以添加自动应用标签或提示用户的逻辑
  // 目前先记录到控制台
  console.log('待应用的标签:', originalLabels);
  
  // 可以在这里添加UI提示或自动标签应用功能
}

/**
 * 测试标签检测功能
 */
function testLabelDetection() {
  console.log('=== Gmail Label Manager: Testing Label Detection ===');
  
  // 测试获取所有标签
  const allLabels = getAllGmailLabels();
  console.log('All Gmail Labels:', allLabels);
  
  // 测试检测当前邮件标签
  const currentLabels = getCurrentEmailLabels();
  console.log('Current Email Labels:', currentLabels);
  
  // 测试线程标签
  const threadLabels = getThreadLabels();
  console.log('Thread Labels:', threadLabels);
  
  // 测试选中邮件标签
  const selectedLabels = getSelectedEmailLabels();
  console.log('Selected Email Labels:', selectedLabels);
  
  // 测试从URL获取标签
  const urlLabels = getLabelsFromUrl();
  console.log('Labels from URL:', urlLabels);
  
  // 测试检测原邮件标签
  const originalLabels = detectOriginalEmailLabels();
  console.log('Original Email Labels:', originalLabels);
  
  // 测试回复检测
  const isReplying = detectReplyAction();
  console.log('Is Replying:', isReplying);
  
  // 保存测试结果到全局对象
  window.gmailLabelManager = window.gmailLabelManager || {};
  window.gmailLabelManager.testResults = {
    allLabels,
    currentLabels,
    threadLabels,
    selectedLabels,
    urlLabels,
    originalLabels,
    isReplying,
    timestamp: new Date().toISOString()
  };
  
  console.log('=== Label Detection Test Completed ===');
}

/**
 * 加载扩展配置
 */
async function loadExtensionConfig() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'getConfig' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      
      if (response.success) {
        extensionConfig = response.data;
        console.log('Extension config loaded:', extensionConfig);
        resolve(extensionConfig);
      } else {
        reject(new Error(response.error || 'Failed to load config'));
      }
    });
  });
}

/**
 * 设置标签观察器，监听标签变化
 */
function setupLabelObserver() {
  // 查找Gmail的标签容器
  const labelContainer = findLabelContainer();
  
  if (labelContainer) {
    console.log('Setting up label observer');
    
    labelObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // 标签列表发生变化时的处理
          handleLabelListChange();
        }
      });
    });
    
    labelObserver.observe(labelContainer, {
      childList: true,
      subtree: true
    });
  } else {
    console.log('Label container not found, will retry later');
    // 延迟重试
    setTimeout(setupLabelObserver, 2000);
  }
}

/**
 * 查找Gmail的标签容器
 */
function findLabelContainer() {
  // Gmail标签通常在侧边栏中，尝试多种选择器
  const selectors = [
    // 新版Gmail标签容器
    '[data-tooltip="Labels"]',
    '[aria-label="Labels"]',
    // 侧边栏标签区域
    '.aim[role="navigation"]',
    '.TK[role="navigation"]',
    // 标签列表容器
    '.TK .TO',
    '.nZ .nH',
    // 通用导航容器
    '[role="navigation"] .TK',
    // 备用选择器
    '.aeN .TK',
    '.nH.oy8Mbf .TK'
  ];
  
  for (const selector of selectors) {
    const container = document.querySelector(selector);
    if (container) {
      console.log('Found label container with selector:', selector);
      return container;
    }
  }
  
  console.log('Label container not found with any selector');
  return null;
}

/**
 * 获取Gmail侧边栏中的所有标签
 */
function getAllGmailLabels() {
  const labels = [];
  
  // 多种标签选择器，适配不同Gmail版本
  const labelSelectors = [
    // 标准标签项
    '.TK .TO .nU',
    '.aim .TO .nU', 
    // 带tooltip的标签
    '[data-tooltip] .nU',
    '[aria-label] .nU',
    // 导航中的标签
    '[role="navigation"] .TO .nU',
    // 侧边栏标签
    '.aeN .TO .nU',
    // 隐藏标签选择器
    '.TK .TO[style*="display: none"] .nU',
    '.aim .TO[style*="display: none"] .nU'
  ];
  
  labelSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      const labelText = element.textContent?.trim();
      const parentElement = element.closest('[data-tooltip], [aria-label]');
      const tooltip = parentElement?.getAttribute('data-tooltip') || 
                     parentElement?.getAttribute('aria-label');
      
      // 移除系统标签过滤，显示所有标签
      if (labelText && labelText.length > 0) {
        const labelState = detectLabelState(element, parentElement);
        const labelInfo = {
          name: labelText,
          tooltip: tooltip || labelText,
          element: element,
          parentElement: parentElement,
          type: isSystemLabel(labelText) ? 'system' : 'user',
          state: labelState.state, // 'show', 'hide', 'show_if_unread'
          isHidden: labelState.isHidden,
          showIfUnread: labelState.showIfUnread
        };
        
        // 避免重复添加
        if (!labels.find(l => l.name === labelText)) {
          labels.push(labelInfo);
        }
      }
    });
  });
  
  // 检测更多隐藏标签和特殊状态标签
  const specialLabels = detectSpecialStateLabels();
  specialLabels.forEach(specialLabel => {
    if (!labels.find(l => l.name === specialLabel.name)) {
      labels.push(specialLabel);
    }
  });
  
  console.log('Found Gmail labels with states:', labels);
  return labels;
}

/**
 * 判断是否为系统标签（用于标识标签类型，不用于过滤）
 */
function isSystemLabel(labelName) {
  const systemLabels = [
    'Inbox', '收件箱',
    'Sent', '已发送',
    'Drafts', '草稿',
    'Spam', '垃圾邮件',
    'Trash', '已删除',
    'Important', '重要',
    'Starred', '已加星标',
    'All Mail', '所有邮件',
    'Compose', '撰写',
    'Snoozed', '已暂停',
    'Scheduled', '已安排',
    'Outbox', '发件箱'
  ];
  
  return systemLabels.includes(labelName);
}

/**
 * 检测标签的显示状态（show, hide, show_if_unread）
 */
function detectLabelState(element, parentElement) {
  if (!element || !parentElement) {
    return { state: 'show', isHidden: false, showIfUnread: false };
  }
  
  const labelContainer = parentElement.closest('.TO, .TK, .aim');
  if (!labelContainer) {
    return { state: 'show', isHidden: false, showIfUnread: false };
  }
  
  const style = window.getComputedStyle(labelContainer);
  const isHidden = style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
  
  // 检测是否为"未读时显示"状态
  // Gmail中这种状态通常通过特定的CSS类或属性来标识
  const showIfUnread = labelContainer.classList.contains('if-unread') ||
                      labelContainer.hasAttribute('data-show-if-unread') ||
                      labelContainer.querySelector('.if-unread') !== null ||
                      // 检测Gmail的内部类名模式
                      labelContainer.classList.contains('byZ') ||
                      labelContainer.classList.contains('bym');
  
  // 检测完全隐藏状态
  if (isHidden && !showIfUnread) {
    return { state: 'hide', isHidden: true, showIfUnread: false };
  }
  
  // 检测"未读时显示"状态
  if (showIfUnread) {
    return { state: 'show_if_unread', isHidden: false, showIfUnread: true };
  }
  
  // 默认为显示状态
  return { state: 'show', isHidden: false, showIfUnread: false };
}

/**
 * 检测标签是否被隐藏（向后兼容）
 */
function isLabelHidden(element) {
  const state = detectLabelState(element, element?.closest('[data-tooltip], [aria-label]'));
  return state.isHidden;
}

/**
 * 检测特殊状态的标签（隐藏和未读显示）
 */
function detectSpecialStateLabels() {
  const specialLabels = [];
  
  // 查找所有可能的特殊状态标签容器
  const specialSelectors = [
    // 隐藏标签
    '.TK .TO[style*="display: none"]',
    '.aim .TO[style*="display: none"]',
    '.TK .TO[style*="visibility: hidden"]',
    '.aim .TO[style*="visibility: hidden"]',
    '.TK .TO[aria-hidden="true"]',
    '.aim .TO[aria-hidden="true"]',
    // 未读时显示的标签
    '.TK .TO.if-unread',
    '.aim .TO.if-unread',
    '.TK .TO[data-show-if-unread]',
    '.aim .TO[data-show-if-unread]',
    '.TK .TO.byZ', // Gmail内部类名
    '.aim .TO.byZ',
    '.TK .TO.bym',
    '.aim .TO.bym'
  ];
  
  specialSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      const labelElement = element.querySelector('.nU');
      if (labelElement) {
        const labelText = labelElement.textContent?.trim();
        const tooltip = element.getAttribute('data-tooltip') || 
                       element.getAttribute('aria-label');
        
        if (labelText && labelText.length > 0) {
          const labelState = detectLabelState(labelElement, element);
          specialLabels.push({
            name: labelText,
            tooltip: tooltip || labelText,
            element: labelElement,
            parentElement: element,
            type: isSystemLabel(labelText) ? 'system' : 'user',
            state: labelState.state,
            isHidden: labelState.isHidden,
            showIfUnread: labelState.showIfUnread
          });
        }
      }
    });
  });
  
  console.log('Found special state labels:', specialLabels);
  return specialLabels;
}

/**
 * 检测隐藏的标签（向后兼容函数）
 */
function detectHiddenLabels() {
  // 使用新的detectSpecialStateLabels函数，但只返回隐藏的标签
  const specialLabels = detectSpecialStateLabels();
  return specialLabels.filter(label => label.state === 'hide');
}

/**
 * 处理标签列表变化
 */
function handleLabelListChange() {
  console.log('Label list changed');
  
  // 获取所有Gmail标签
  const allLabels = getAllGmailLabels();
  
  // 应用自定义标签名称
  applyCustomLabelNames();
  
  // 应用标签顺序（如果配置了）
  applyLabelOrder();
  
  // 缓存标签信息供后续使用
  window.gmailLabelManager = window.gmailLabelManager || {};
  window.gmailLabelManager.allLabels = allLabels;
}

/**
 * 应用自定义标签名称
 */
function applyCustomLabelNames() {
  if (!extensionConfig?.customLabels) return;
  
  const labelElements = document.querySelectorAll('[data-tooltip]');
  
  labelElements.forEach(element => {
    const originalName = element.getAttribute('data-tooltip');
    const customLabel = extensionConfig.customLabels[originalName];
    
    if (customLabel && customLabel.customName) {
      // 更新显示的标签名称，但保持原始tooltip
      const textElement = element.querySelector('.TK .TO .nU');
      if (textElement) {
        textElement.textContent = customLabel.customName;
        // 保存原始名称以便恢复
        element.setAttribute('data-original-name', originalName);
      }
    }
  });
}

/**
 * 应用标签顺序
 */
function applyLabelOrder() {
  if (!extensionConfig?.labelOrder?.orderedLabelIds?.length) return;
  
  // 这里将在后续版本中实现标签重排序功能
  console.log('Label order application will be implemented in next phase');
}

/**
 * 设置回复邮件监听器
 */
function setupReplyObserver() {
  console.log('Setting up reply observer');
  
  // 监听页面变化，检测回复操作
  const replyObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        // 检查是否有新的撰写窗口出现
        detectComposeWindows();
        
        // 检查回复按钮点击
        detectReplyButtonClicks();
      }
    });
  });
  
  replyObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // 直接监听回复按钮点击事件
  setupReplyButtonListeners();
}

/**
 * 检测撰写窗口
 */
function detectComposeWindows() {
  const composeWindows = document.querySelectorAll('[role="dialog"]');
  composeWindows.forEach(window => {
    if (!window.hasAttribute('data-label-manager-processed')) {
      window.setAttribute('data-label-manager-processed', 'true');
      handleComposeWindow(window);
    }
  });
}

/**
 * 设置回复按钮监听器
 */
function setupReplyButtonListeners() {
  // 查找所有可能的回复按钮
  const replyButtonSelectors = [
    '[data-tooltip="Reply"]',
    '[aria-label*="Reply"]',
    '[data-tooltip="回复"]',
    '.T-I.J-J5-Ji.T-I-Js-Gs.aaq.T-I-ax7.L3', // Gmail回复按钮类名
    '.ams.bkH', // 另一种回复按钮
    '.ar9.T-I-J3.J-J5-Ji', // 回复所有按钮
    'div[role="button"][data-tooltip*="Reply"]'
  ];
  
  replyButtonSelectors.forEach(selector => {
    const buttons = document.querySelectorAll(selector);
    buttons.forEach(button => {
      if (!button.hasAttribute('data-reply-listener-added')) {
        button.setAttribute('data-reply-listener-added', 'true');
        button.addEventListener('click', handleReplyButtonClick);
      }
    });
  });
}

/**
 * 检测回复按钮点击
 */
function detectReplyButtonClicks() {
  // 重新设置监听器，以防新按钮出现
  setupReplyButtonListeners();
}

/**
 * 处理回复按钮点击事件
 */
function handleReplyButtonClick(event) {
  console.log('Reply button clicked:', event.target);
  
  // 保存当前邮件的标签信息
  const currentLabels = detectOriginalEmailLabels();
  
  // 存储到全局对象供后续使用
  window.gmailLabelManager = window.gmailLabelManager || {};
  window.gmailLabelManager.pendingReplyLabels = currentLabels;
  window.gmailLabelManager.replyTimestamp = Date.now();
  
  console.log('Stored labels for pending reply:', currentLabels);
  
  // 延迟处理撰写窗口，等待其完全加载
  setTimeout(() => {
    const composeWindows = document.querySelectorAll('[role="dialog"]');
    const latestWindow = composeWindows[composeWindows.length - 1];
    if (latestWindow && !latestWindow.hasAttribute('data-label-manager-processed')) {
      latestWindow.setAttribute('data-label-manager-processed', 'true');
      handleComposeWindow(latestWindow, currentLabels);
    }
  }, 500);
}

/**
 * 处理撰写窗口（回复/转发）
 */
function handleComposeWindow(composeWindow, preDetectedLabels = null) {
  console.log('New compose window detected');
  
  // 检查是否是回复邮件
  const isReply = isReplyWindow(composeWindow);
  
  if (isReply && extensionConfig?.userConfig?.autoApplyLabels) {
    // 使用预检测的标签或重新检测
    const labelsToApply = preDetectedLabels || 
                         window.gmailLabelManager?.pendingReplyLabels || 
                         detectOriginalEmailLabels();
    
    if (labelsToApply && labelsToApply.length > 0) {
      // 延迟应用标签，等待界面稳定
      setTimeout(() => {
        detectAndApplyLabels(composeWindow, labelsToApply);
      }, 1000);
    }
  }
}

/**
 * 检查是否为回复窗口
 */
function isReplyWindow(composeWindow) {
  // 多种方式检测回复窗口
  const replyIndicators = [
    // 查找回复相关的按钮或文本
    () => composeWindow.querySelector('[data-tooltip="Reply"]'),
    () => composeWindow.querySelector('[aria-label*="Reply"]'),
    () => composeWindow.querySelector('[data-tooltip="回复"]'),
    // 检查主题行是否包含Re:
    () => {
      const subjectInput = composeWindow.querySelector('input[name="subjectbox"]');
      return subjectInput && subjectInput.value.startsWith('Re:');
    },
    // 检查窗口内容是否包含回复标识
    () => composeWindow.textContent.includes('Re:'),
    // 检查是否有引用的原邮件内容
    () => composeWindow.querySelector('.gmail_quote'),
    () => composeWindow.querySelector('[data-smartcompose-id]'),
    // 检查窗口标题
    () => {
      const titleElement = composeWindow.querySelector('[role="heading"]');
      return titleElement && titleElement.textContent.includes('Re:');
    }
  ];
  
  return replyIndicators.some(check => {
    try {
      return check();
    } catch (error) {
      return false;
    }
  });
}

/**
 * 检测并应用标签到回复邮件
 */
function detectAndApplyLabels(composeWindow, providedLabels = null) {
  console.log('Detecting and applying labels to reply');
  
  // 获取要应用的标签
  const labelsToApply = providedLabels || detectOriginalEmailLabels();
  
  if (labelsToApply && labelsToApply.length > 0) {
    console.log('Found labels to apply:', labelsToApply);
    
    // 过滤掉系统标签，只处理用户标签
    const userLabels = labelsToApply.filter(label => typeof label === 'string' ? !isSystemLabel(label) : !isSystemLabel(label.name));
    
    if (userLabels.length > 0) {
      if (extensionConfig?.userConfig?.requireConfirmation) {
        showLabelConfirmation(userLabels, composeWindow);
      } else {
        // 自动应用标签
        applyLabelsToReply(userLabels, composeWindow);
      }
    }
  }
}

/**
 * 应用标签到回复邮件
 */
function applyLabelsToReply(labels, composeWindow) {
  console.log('Applying labels to reply:', labels);
  
  // 在撰写窗口中显示标签提示
  showLabelsInComposeWindow(labels, composeWindow);
  
  // 存储标签信息，在发送时应用
  if (!window.gmailLabelManager) {
    window.gmailLabelManager = {};
  }
  window.gmailLabelManager.labelsToApply = labels;
  
  // 监听发送按钮点击
  setupSendButtonListener(composeWindow);
}

/**
 * 在撰写窗口中显示标签
 */
function showLabelsInComposeWindow(labels, composeWindow) {
  // 查找合适的位置插入标签显示
  const insertionPoint = findLabelInsertionPoint(composeWindow);
  
  if (insertionPoint) {
    // 创建标签显示容器
    const labelContainer = createLabelDisplayContainer(labels);
    insertionPoint.appendChild(labelContainer);
  }
}

/**
 * 查找标签插入点
 */
function findLabelInsertionPoint(composeWindow) {
  // 尝试多个可能的插入位置
  const selectors = [
    '.aoD.hl', // 撰写窗口主体
    '.Ar.Au', // 另一个可能的位置
    '.aYF', // 工具栏区域
    '.gU.Up' // 底部区域
  ];
  
  for (const selector of selectors) {
    const element = composeWindow.querySelector(selector);
    if (element) {
      return element;
    }
  }
  
  // 如果找不到特定位置，使用撰写窗口本身
  return composeWindow;
}

/**
 * 创建标签显示容器
 */
function createLabelDisplayContainer(labels) {
  const container = document.createElement('div');
  container.className = 'gmail-label-manager-labels';
  container.style.cssText = `
    padding: 8px;
    background: #f8f9fa;
    border: 1px solid #dadce0;
    border-radius: 4px;
    margin: 4px 0;
    font-size: 12px;
    color: #5f6368;
  `;
  
  const title = document.createElement('span');
  title.textContent = '将应用标签: ';
  title.style.fontWeight = 'bold';
  container.appendChild(title);
  
  labels.forEach((label, index) => {
    if (index > 0) {
      const separator = document.createElement('span');
      separator.textContent = ', ';
      container.appendChild(separator);
    }
    
    const labelSpan = document.createElement('span');
    labelSpan.textContent = typeof label === 'string' ? label : label.name;
    labelSpan.style.cssText = `
      background: #e8f0fe;
      color: #1a73e8;
      padding: 2px 6px;
      border-radius: 12px;
      margin: 0 2px;
    `;
    container.appendChild(labelSpan);
  });
  
  return container;
}

/**
 * 设置发送按钮监听器
 */
function setupSendButtonListener(composeWindow) {
  const sendButton = composeWindow.querySelector('[data-tooltip="Send"]') ||
                    composeWindow.querySelector('[aria-label*="Send"]') ||
                    composeWindow.querySelector('.T-I.J-J5-Ji.aoO.v7.T-I-atl.L3');
  
  if (sendButton && !sendButton.hasAttribute('data-label-send-listener')) {
    sendButton.setAttribute('data-label-send-listener', 'true');
    sendButton.addEventListener('click', handleSendButtonClick);
  }
}

/**
 * 处理发送按钮点击
 */
function handleSendButtonClick(event) {
  console.log('Send button clicked, applying labels...');
  
  const labelsToApply = window.gmailLabelManager?.labelsToApply;
  if (labelsToApply && labelsToApply.length > 0) {
    // 这里可以通过Gmail API或其他方式应用标签
    // 由于Gmail的限制，我们主要是提供视觉提示
    console.log('Labels that would be applied:', labelsToApply);
    
    // 清理临时数据
    delete window.gmailLabelManager.labelsToApply;
    delete window.gmailLabelManager.pendingReplyLabels;
  }
}

/**
 * 检测原邮件的标签
 */
function detectOriginalEmailLabels() {
  console.log('Detecting original email labels');
  
  const labels = [];
  
  try {
    // 方法1: 从当前邮件视图中检测标签
    const currentEmailLabels = getCurrentEmailLabels();
    if (currentEmailLabels.length > 0) {
      labels.push(...currentEmailLabels);
    }
    
    // 方法2: 从邮件线程中检测标签
    const threadLabels = getThreadLabels();
    if (threadLabels.length > 0) {
      labels.push(...threadLabels);
    }
    
    // 方法3: 从选中邮件中检测标签
    const selectedLabels = getSelectedEmailLabels();
    if (selectedLabels.length > 0) {
      labels.push(...selectedLabels);
    }
    
    // 方法4: 从邮件头部信息中检测标签
    const headerLabels = getEmailHeaderLabels();
    if (headerLabels.length > 0) {
      labels.push(...headerLabels);
    }
    
    // 方法5: 从URL参数中检测标签信息
    const urlLabels = getLabelsFromUrl();
    if (urlLabels.length > 0) {
      labels.push(...urlLabels);
    }
    
    // 方法6: 从Gmail侧边栏当前选中的标签检测
    const sidebarLabels = getCurrentSidebarLabels();
    if (sidebarLabels.length > 0) {
      labels.push(...sidebarLabels);
    }
    
    // 去重并转换为对象格式
    const uniqueLabels = [...new Set(labels)];
    const labelObjects = uniqueLabels.map(label => {
      if (typeof label === 'string') {
        return {
          id: `Label_${label}`,
          name: label,
          type: 'user'
        };
      }
      return label;
    });
    
    console.log('Detected original email labels:', labelObjects);
    
    return labelObjects;
    
  } catch (error) {
    console.error('Error detecting original email labels:', error);
    return [];
  }
}

/**
 * 获取当前侧边栏选中的标签
 */
function getCurrentSidebarLabels() {
  const labels = [];
  
  try {
    // 查找侧边栏中当前选中的标签
    const sidebarSelectors = [
      '.aim[aria-selected="true"]', // 选中的标签
      '.aim.aiq', // 高亮的标签
      '.TK .nZ .aim[aria-selected="true"]', // 侧边栏选中标签
      '.TK .TO.nZ .aim.aiq' // 另一种选中状态
    ];
    
    sidebarSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const labelText = element.textContent?.trim() ||
                         element.getAttribute('title')?.trim() ||
                         element.getAttribute('aria-label')?.trim();
        
        if (labelText && !isSystemLabel(labelText) && !labels.includes(labelText)) {
          labels.push(labelText);
        }
      });
    });
    
  } catch (error) {
    console.error('Error getting sidebar labels:', error);
  }
  
  return labels;
}

/**
 * 获取当前邮件的标签
 */
function getCurrentEmailLabels() {
  const labels = [];
  
  // 查找邮件标签的多种选择器
  const labelSelectors = [
    // 邮件详情中的标签
    '.hA[data-tooltip]',
    '.ar .hA',
    // 邮件头部标签
    '.aKS .hA',
    '.aKS [data-tooltip]',
    // 标签显示区域
    '.aKS .ar .hA',
    // 其他可能的标签位置
    '.ii .hA[data-tooltip]',
    // 邮件线程中的标签
    '.h7 .hA',
    '.h7 [data-tooltip]',
    // 邮件列表中的标签
    '.yW .ar .hA',
    // 新版Gmail标签
    '[data-legacy-thread-id] .hA',
    '.zA .ar .hA'
  ];
  
  labelSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      const labelText = element.textContent?.trim() || 
                       element.getAttribute('data-tooltip')?.trim() ||
                       element.getAttribute('aria-label')?.trim();
      
      if (labelText && !isSystemLabel(labelText) && !labels.includes(labelText)) {
        labels.push(labelText);
      }
    });
  });
  
  return labels;
}

/**
 * 获取邮件线程的标签
 */
function getThreadLabels() {
  const labels = [];
  
  // 查找邮件线程标签的选择器
  const threadSelectors = [
    // 线程视图中的标签
    '.h7 .hA[data-tooltip]',
    '.h7 .ar .hA',
    // 对话视图中的标签
    '.ii .h7 .hA',
    // 邮件头部线程标签
    '.aKS .h7 .hA'
  ];
  
  threadSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      const labelText = element.textContent?.trim() || 
                       element.getAttribute('data-tooltip')?.trim();
      
      if (labelText && !isSystemLabel(labelText) && !labels.includes(labelText)) {
        labels.push(labelText);
      }
    });
  });
  
  return labels;
}

/**
 * 获取邮件列表中选中邮件的标签
 */
function getSelectedEmailLabels() {
  const labels = [];
  
  // 查找选中邮件的标签
  const selectedSelectors = [
    // 选中的邮件行
    '.zA.x7 .ar .hA',
    '.zA.yW .ar .hA',
    // 高亮的邮件
    '.zA.zE .ar .hA',
    // 当前邮件
    '.zA.yO .ar .hA'
  ];
  
  selectedSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      const labelText = element.textContent?.trim() || 
                       element.getAttribute('data-tooltip')?.trim();
      
      if (labelText && !isSystemLabel(labelText) && !labels.includes(labelText)) {
        labels.push(labelText);
      }
    });
  });
  
  return labels;
}

/**
 * 从邮件头部获取标签信息
 */
function getEmailHeaderLabels() {
  const labels = [];
  
  // 查找邮件头部的标签信息
  const headerSelectors = [
    '.aKS .ar',
    '.aKS .hA',
    '.ii .ar .hA'
  ];
  
  headerSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      const labelText = element.textContent?.trim();
      if (labelText && !isSystemLabel(labelText) && !labels.includes(labelText)) {
        labels.push(labelText);
      }
    });
  });
  
  return labels;
}

/**
 * 从URL参数中获取标签信息
 */
function getLabelsFromUrl() {
  const labels = [];
  
  try {
    const url = window.location.href;
    const urlParams = new URLSearchParams(window.location.search);
    
    // 检查URL中的标签参数
    if (url.includes('/label/')) {
      const labelMatch = url.match(/\/label\/([^/?]+)/);
      if (labelMatch && labelMatch[1]) {
        const labelName = decodeURIComponent(labelMatch[1]);
        if (!isSystemLabel(labelName)) {
          labels.push(labelName);
        }
      }
    }
    
    // 检查其他可能的标签参数
    const labelParam = urlParams.get('label');
    if (labelParam && !isSystemLabel(labelParam)) {
      labels.push(labelParam);
    }
    
  } catch (error) {
    console.error('Error parsing labels from URL:', error);
  }
  
  return labels;
}

/**
 * 显示标签确认对话框
 */
function showLabelConfirmation(labels, composeWindow) {
  console.log('Showing label confirmation dialog for:', labels);
  
  // 检查是否已经存在确认对话框
  const existingDialog = document.querySelector('.gmail-label-manager-confirmation');
  if (existingDialog) {
    existingDialog.remove();
  }
  
  // 创建确认对话框
  const dialog = createConfirmationDialog(labels, composeWindow);
  
  // 添加到页面
  document.body.appendChild(dialog);
  
  // 添加动画效果
  setTimeout(() => {
    dialog.style.opacity = '1';
    dialog.querySelector('.dialog-content').style.transform = 'scale(1)';
  }, 10);
}

/**
 * 创建确认对话框
 */
function createConfirmationDialog(labels, composeWindow) {
  const dialog = document.createElement('div');
  dialog.className = 'gmail-label-manager-confirmation';
  dialog.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  
  const dialogContent = document.createElement('div');
  dialogContent.className = 'dialog-content';
  dialogContent.style.cssText = `
    background: white;
    border-radius: 8px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    transform: scale(0.9);
    transition: transform 0.3s ease;
  `;
  
  // 标题
  const title = document.createElement('h3');
  title.textContent = '应用标签到回复邮件';
  title.style.cssText = `
    margin: 0 0 16px 0;
    font-size: 18px;
    font-weight: 500;
    color: #202124;
  `;
  
  // 描述
  const description = document.createElement('p');
  description.textContent = '检测到原邮件包含以下标签，是否要将这些标签应用到回复邮件？';
  description.style.cssText = `
    margin: 0 0 16px 0;
    font-size: 14px;
    color: #5f6368;
    line-height: 1.4;
  `;
  
  // 标签列表
  const labelList = createLabelList(labels);
  
  // 按钮容器
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 24px;
  `;
  
  // 取消按钮
  const cancelButton = document.createElement('button');
  cancelButton.textContent = '取消';
  cancelButton.style.cssText = `
    padding: 8px 16px;
    border: 1px solid #dadce0;
    background: white;
    color: #3c4043;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;
  `;
  
  cancelButton.addEventListener('mouseenter', () => {
    cancelButton.style.backgroundColor = '#f8f9fa';
  });
  
  cancelButton.addEventListener('mouseleave', () => {
    cancelButton.style.backgroundColor = 'white';
  });
  
  cancelButton.addEventListener('click', () => {
    closeConfirmationDialog(dialog);
  });
  
  // 确认按钮
  const confirmButton = document.createElement('button');
  confirmButton.textContent = '应用标签';
  confirmButton.style.cssText = `
    padding: 8px 16px;
    border: none;
    background: #1a73e8;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s;
  `;
  
  confirmButton.addEventListener('mouseenter', () => {
    confirmButton.style.backgroundColor = '#1557b0';
  });
  
  confirmButton.addEventListener('mouseleave', () => {
    confirmButton.style.backgroundColor = '#1a73e8';
  });
  
  confirmButton.addEventListener('click', () => {
    applyLabelsToReply(labels, composeWindow);
    closeConfirmationDialog(dialog);
  });
  
  // 组装对话框
  buttonContainer.appendChild(cancelButton);
  buttonContainer.appendChild(confirmButton);
  
  dialogContent.appendChild(title);
  dialogContent.appendChild(description);
  dialogContent.appendChild(labelList);
  dialogContent.appendChild(buttonContainer);
  
  dialog.appendChild(dialogContent);
  
  // 点击背景关闭
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      closeConfirmationDialog(dialog);
    }
  });
  
  // ESC键关闭
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeConfirmationDialog(dialog);
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  return dialog;
}

/**
 * 创建标签列表
 */
function createLabelList(labels) {
  const container = document.createElement('div');
  container.style.cssText = `
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 16px 0;
  `;
  
  labels.forEach(label => {
    const labelElement = document.createElement('span');
    labelElement.textContent = typeof label === 'string' ? label : label.name;
    labelElement.style.cssText = `
      background: #e8f0fe;
      color: #1a73e8;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
    `;
    container.appendChild(labelElement);
  });
  
  return container;
}

/**
 * 关闭确认对话框
 */
function closeConfirmationDialog(dialog) {
  dialog.style.opacity = '0';
  dialog.querySelector('.dialog-content').style.transform = 'scale(0.9)';
  
  setTimeout(() => {
    if (dialog.parentNode) {
      dialog.parentNode.removeChild(dialog);
    }
  }, 300);
}

/**
 * 初始化标签拖拽功能
 */
function initializeLabelDragAndDrop() {
  console.log('Label drag and drop will be implemented in phase 3');
}

/**
 * 监听来自background script的消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  switch (request.action) {
    case 'configUpdated':
      // 配置更新时重新加载
      loadExtensionConfig().then(() => {
        console.log('Configuration reloaded');
        handleLabelListChange(); // 重新应用配置
      });
      break;
      
    case 'getLabels':
      // 获取Gmail标签数据
      try {
        const labels = getAllGmailLabels();
        console.log('Returning Gmail labels to background:', labels);
        sendResponse({ 
          success: true, 
          labels: labels 
        });
      } catch (error) {
        console.error('Error getting Gmail labels:', error);
        sendResponse({ 
          success: false, 
          error: error.message 
        });
      }
      return true; // 保持消息通道开放
      
    default:
      console.log('Unknown message action:', request.action);
  }
  
  sendResponse({ success: true });
});

/**
 * 页面卸载时清理资源
 */
window.addEventListener('beforeunload', () => {
  if (labelObserver) {
    labelObserver.disconnect();
  }
});

// 初始化扩展
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}