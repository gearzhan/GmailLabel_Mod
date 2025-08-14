// Gmail标签管理器 - 选项页面脚本
// 处理详细配置和标签管理功能

/**
 * 全局变量
 */
let currentConfig = null;
let gmailLabels = [];
let hasUnsavedChanges = false;

/**
 * 页面加载完成后初始化
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Options page loaded');
  
  try {
    await loadConfiguration();
    await loadGmailLabels();
    setupEventListeners();
    updateUI();
  } catch (error) {
    console.error('Error initializing options page:', error);
    showError('Failed to load extension configuration');
  }
});

/**
 * 加载扩展配置
 */
async function loadConfiguration() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'getConfig' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      
      if (response.success) {
        currentConfig = response.data;
        console.log('Configuration loaded:', currentConfig);
        resolve(currentConfig);
      } else {
        reject(new Error(response.error || 'Failed to load configuration'));
      }
    });
  });
}

/**
 * 加载Gmail标签（从Gmail页面获取真实数据）
 */
async function loadGmailLabels(retry = 0) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'getGmailLabels' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error loading Gmail labels:', chrome.runtime.lastError);
        // 如果无法获取真实数据，使用空数组但不报错，交给 UI 展示 empty 状态
        gmailLabels = buildFallbackLabelsFromConfig(currentConfig);
        resolve(gmailLabels);
        return;
      }
      
      if (response && response.success) {
        if (Array.isArray(response.labels) && response.labels.length > 0) {
        // 处理从Gmail获取的标签数据，确保格式正确
        gmailLabels = response.labels.map(label => {
          // 如果标签对象已经有正确的格式，直接使用
          if (typeof label === 'object' && label.name) {
            return {
              id: label.id || label.name,
              name: label.name,
              type: label.type || 'user', // 默认为用户标签
              tooltip: label.tooltip || label.name
            };
          }
          // 如果是字符串格式，转换为对象
          else if (typeof label === 'string') {
            return {
              id: label,
              name: label,
              type: 'user',
              tooltip: label
            };
          }
          return null;
        }).filter(label => label !== null); // 过滤掉无效标签
        
          console.log('Gmail labels loaded from Gmail page:', gmailLabels);
          resolve(gmailLabels);
        } else {
          // 成功响应但无数据，可能是Gmail尚未渲染完成；短暂重试几次
          if (retry < 3) {
            setTimeout(() => {
              loadGmailLabels(retry + 1).then(resolve).catch(reject);
            }, 800);
            return;
          }
          console.warn('Gmail labels response is empty; using fallback after retries');
          gmailLabels = buildFallbackLabelsFromConfig(currentConfig);
          resolve(gmailLabels);
        }
      } else {
        const errorMsg = response && response.error ? response.error : 'Unknown error or empty response';
        console.warn('Failed to load Gmail labels:', errorMsg);
        // 如果获取失败，使用配置构建的回退数据，保证选项页可用
        gmailLabels = buildFallbackLabelsFromConfig(currentConfig);
        resolve(gmailLabels);
      }
    });
  });
}

/**
 * 当无法从Gmail页面读取标签时，根据当前配置构造一个可工作的回退列表
 */
function buildFallbackLabelsFromConfig(config) {
  const result = [];
  if (!config) return result;

  // 常见系统标签（仅用于展示，不保证完整）
  const system = ['Inbox','Starred','Snoozed','Sent','Drafts'];
  system.forEach(name => result.push({ id: name, name, type: 'system', tooltip: name }));

  // 从自定义名称和排序中推断用户标签
  const userSet = new Set();
  const ordered = config?.labelOrder?.orderedLabelIds || [];
  ordered.forEach(name => userSet.add(name));
  const custom = config?.customLabels || {};
  Object.keys(custom).forEach(name => userSet.add(name));

  Array.from(userSet).forEach(name => {
    result.push({ id: name, name, type: 'user', tooltip: name });
  });

  return result;
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
  // 切换开关事件
  const autoApplyToggle = document.getElementById('autoApplyToggle');
  const labelApplicationMode = document.getElementById('labelApplicationMode');
  const dragDropToggle = document.getElementById('dragDropToggle');
  const notificationStyle = document.getElementById('notificationStyle');
  
  // 移除自动应用相关事件（功能已取消）
  
  dragDropToggle.addEventListener('click', () => {
    toggleSetting('enableDragAndDrop', dragDropToggle);
  });
  
  // 通知样式设置也已移除
  
  // 搜索框事件
  const labelSearch = document.getElementById('labelSearch');
  labelSearch.addEventListener('input', (e) => {
    filterLabels(e.target.value);
  });
  
  // 按钮事件
  document.getElementById('saveBtn').addEventListener('click', saveAllChanges);
  document.getElementById('resetBtn').addEventListener('click', resetToDefaults);
  
  // 页面离开前检查未保存的更改
  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    }
  });
}

/**
 * 切换设置选项
 */
function toggleSetting(settingKey, toggleElement) {
  if (!currentConfig || !currentConfig.userConfig) {
    showError('Configuration not loaded');
    return;
  }
  
  // 切换设置值
  currentConfig.userConfig[settingKey] = !currentConfig.userConfig[settingKey];
  
  // 更新UI
  updateToggleState(toggleElement, currentConfig.userConfig[settingKey]);
  
  // 标记有未保存的更改
  markUnsavedChanges();
}

/**
 * 更新设置选项
 */
function updateSetting(settingKey, value) {
  if (!currentConfig || !currentConfig.userConfig) {
    showError('Configuration not loaded');
    return;
  }
  
  currentConfig.userConfig[settingKey] = value;
  markUnsavedChanges();
}

/**
 * 标记有未保存的更改
 */
function markUnsavedChanges() {
  hasUnsavedChanges = true;
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.textContent = 'Save Changes *';
  saveBtn.style.background = '#ea4335';
}

/**
 * 清除未保存更改标记
 */
function clearUnsavedChanges() {
  hasUnsavedChanges = false;
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.textContent = 'Save Changes';
  saveBtn.style.background = '#1a73e8';
}

/**
 * 更新标签模式相关设置
 */
function updateLabelModeSettings(mode) {
  if (!currentConfig || !currentConfig.userConfig) {
    return;
  }
  
  // 根据模式更新相关配置
  switch (mode) {
    case 'auto':
      currentConfig.userConfig.requireConfirmation = false;
      currentConfig.userConfig.autoApplyLabels = true;
      break;
    case 'confirm':
      currentConfig.userConfig.requireConfirmation = true;
      currentConfig.userConfig.autoApplyLabels = true;
      break;
    case 'manual':
      currentConfig.userConfig.requireConfirmation = false;
      currentConfig.userConfig.autoApplyLabels = false;
      break;
  }
  
  markUnsavedChanges();
}

/**
 * 更新UI界面
 */
function updateUI() {
  if (!currentConfig) {
    return;
  }
  
  // 更新切换开关状态
  const userConfig = currentConfig.userConfig || {};
  
  // 已移除自动应用设置
  
  updateToggleState(
    document.getElementById('dragDropToggle'),
    userConfig.enableDragAndDrop
  );
  
  // 更新下拉选择
  // 已移除通知样式设置
  
  // 更新标签列表
  updateLabelList();

  // 根据是否加载到标签显示/隐藏空状态
  const loadingElement = document.getElementById('labelListLoading');
  if (loadingElement) loadingElement.style.display = 'none';
}

/**
 * 更新切换开关状态
 */
function updateToggleState(toggleElement, isActive) {
  if (isActive) {
    toggleElement.classList.add('active');
  } else {
    toggleElement.classList.remove('active');
  }
}

/**
 * 更新标签列表
 */
function updateLabelList() {
  const loadingElement = document.getElementById('labelListLoading');
  const listElement = document.getElementById('labelList');
  const emptyElement = document.getElementById('labelListEmpty');
  
  // 隐藏加载状态
  loadingElement.style.display = 'none';
  
  if (gmailLabels.length === 0) {
    emptyElement.style.display = 'block';
    listElement.style.display = 'none';
    return;
  }
  
  emptyElement.style.display = 'none';
  listElement.style.display = 'block';
  
  // 清空现有列表
  listElement.innerHTML = '';
  
  // 显示所有标签（包括系统标签和用户标签）。优先使用原始名字段
  let allLabels = gmailLabels.map(l => ({
    id: l.id || l.name || l.originalName,
    name: l.originalName || l.name,
    type: l.type || 'user',
    tooltip: l.tooltip || (l.originalName || l.name)
  }));
  // 去重：同名只保留一次
  const uniqueMap = new Map();
  allLabels.forEach(lbl => { if (!uniqueMap.has(lbl.name)) uniqueMap.set(lbl.name, lbl); });
  allLabels = Array.from(uniqueMap.values());
  
  // 按保存的顺序排序标签
  if (currentConfig.labelOrder && currentConfig.labelOrder.orderedLabelIds) {
    const orderedIds = currentConfig.labelOrder.orderedLabelIds;
    // 允许用“自定义名或原名”匹配排序
    const labelMap = new Map();
    allLabels.forEach(label => {
      labelMap.set(label.name, label);
      const custom = currentConfig.customLabels?.[label.name];
      if (custom?.customName) {
        labelMap.set(custom.customName, label);
      }
    });

    // 先添加已排序的标签，按“原始名”去重
    const sortedLabels = [];
    const addedNames = new Set();
    orderedIds.forEach(labelName => {
      const found = labelMap.get(labelName);
      if (found && !addedNames.has(found.name)) {
        sortedLabels.push(found);
        addedNames.add(found.name);
      }
    });

    // 添加新的未排序标签（去重）
    const remainingLabels = [];
    Array.from(new Set(labelMap.values())).forEach(label => {
      if (!addedNames.has(label.name)) remainingLabels.push(label);
    });
    allLabels = [...sortedLabels, ...remainingLabels];
  }
  
  // 按类型分组显示：先显示用户标签，再显示系统标签
  const userLabels = allLabels.filter(label => label.type === 'user');
  const systemLabels = allLabels.filter(label => label.type === 'system');
  
  // 添加用户标签
  if (userLabels.length > 0) {
    const userSection = document.createElement('div');
    userSection.className = 'label-section';
    userSection.innerHTML = '<h3 class="label-section-title">User Labels</h3>';
    const userContainer = document.createElement('div');
    userSection.appendChild(userContainer);
    listElement.appendChild(userSection);
    
    userLabels.forEach(label => {
      const labelItem = createLabelItem(label);
      userContainer.appendChild(labelItem);
    });
  }
  
  // 添加系统标签
  if (systemLabels.length > 0) {
    const systemSection = document.createElement('div');
    systemSection.className = 'label-section';
    systemSection.innerHTML = '<h3 class="label-section-title">System Labels</h3>';
    const systemContainer = document.createElement('div');
    systemSection.appendChild(systemContainer);
    listElement.appendChild(systemSection);
    
    systemLabels.forEach(label => {
      const labelItem = createLabelItem(label);
      labelItem.classList.add('system-label');
      systemContainer.appendChild(labelItem);
    });
  }
}

/**
 * 创建标签项元素
 */
function createLabelItem(label) {
  const item = document.createElement('div');
  item.className = 'label-item';
  item.setAttribute('data-label-id', label.id || label.name);
  item.setAttribute('data-label-name', label.name);
  item.setAttribute('data-label-type', label.type || 'user');
  const isSystem = (label.type || 'user') === 'system';
  item.draggable = !isSystem;
  
  const customLabel = currentConfig.customLabels?.[label.name] || {};
  const customName = customLabel.customName || '';
  
  // 添加标签类型和隐藏状态的视觉标识
  const typeIndicator = label.type === 'system' ? '<span class="label-type-badge system">System</span>' : '<span class="label-type-badge user">User</span>';
  const hiddenIndicator = label.isHidden ? '<span class="label-hidden-badge">Hidden</span>' : '';
  
  item.innerHTML = `
    <div class="drag-handle" style="${isSystem ? 'visibility:hidden;' : ''}">⋮⋮</div>
    <div class="label-info">
      <div class="label-original">${label.name}</div>
      <div class="label-badges">${typeIndicator}${hiddenIndicator}</div>
    </div>
    <div class="label-custom">
      <input type="text" value="${customName}" ${isSystem ? 'disabled' : ''}
             placeholder="${isSystem ? 'System label (locked)' : 'Custom name (optional)'}" 
             data-label-name="${label.name}">
    </div>
  `;
  
  // 添加输入框事件监听
  const input = item.querySelector('input');
  if (!isSystem) {
    input.addEventListener('input', (e) => {
    const originalName = e.target.getAttribute('data-label-name');
    const customName = e.target.value;
    updateLabelCustomName(originalName, customName);
    markUnsavedChanges();
    });
  }

  // 若一个“自定义名”对应多个条目，只显示第一条，其余隐藏
  if (!isSystem && customName) {
    const existing = document.querySelector(
      `.label-item input[value="${customName.replace(/"/g, '\\"')}"]`
    );
    if (existing && existing !== input) {
      item.style.display = 'none';
    }
  }
  
  // 添加拖拽事件监听
  if (!isSystem) {
    setupDragAndDrop(item);
  }
  
  return item;
}

/**
 * 设置拖拽排序功能
 */
function setupDragAndDrop(item) {
  item.addEventListener('dragstart', handleDragStart);
  item.addEventListener('dragover', handleDragOver);
  item.addEventListener('dragenter', handleDragEnter);
  item.addEventListener('dragleave', handleDragLeave);
  item.addEventListener('drop', handleDrop);
  item.addEventListener('dragend', handleDragEnd);
}

let draggedElement = null;

/**
 * 拖拽开始处理
 */
function handleDragStart(e) {
  draggedElement = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.outerHTML);
}

/**
 * 拖拽悬停处理
 */
function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  return false;
}

/**
 * 拖拽进入处理
 */
function handleDragEnter(e) {
  if (this !== draggedElement) {
    this.classList.add('drag-over');
  }
}

/**
 * 拖拽离开处理
 */
function handleDragLeave(e) {
  this.classList.remove('drag-over');
}

/**
 * 拖拽放置处理
 */
function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  
  if (draggedElement !== this) {
    // 在同一分组容器内移动
    const group = this.parentNode; // .label-section 内部的 div 容器
    const allItems = Array.from(group.querySelectorAll('.label-item'));
    const draggedIndex = allItems.indexOf(draggedElement);
    const targetIndex = allItems.indexOf(this);
    
    if (draggedIndex < targetIndex) {
      group.insertBefore(draggedElement, this.nextSibling);
    } else {
      group.insertBefore(draggedElement, this);
    }
    
    // 更新标签顺序
    updateLabelOrder();
    markUnsavedChanges();
  }
  
  this.classList.remove('drag-over');
  return false;
}

/**
 * 拖拽结束处理
 */
function handleDragEnd(e) {
  this.classList.remove('dragging');
  
  // 清除所有拖拽样式
  const allItems = document.querySelectorAll('.label-item');
  allItems.forEach(item => {
    item.classList.remove('drag-over', 'dragging');
  });
  
  draggedElement = null;
}

/**
 * 更新标签顺序
 */
function updateLabelOrder() {
  const labelList = document.getElementById('labelList');
  // 只读取每个分组容器里的标签项，避免把两个分组混在一起
  const groupContainers = Array.from(labelList.querySelectorAll('.label-section > div'));
  const orderedLabelNames = [];
  groupContainers.forEach(group => {
    const items = Array.from(group.querySelectorAll('.label-item'));
    items.forEach(item => {
      const name = item.getAttribute('data-label-name');
      if (name) orderedLabelNames.push(name);
    });
  });
  
  if (!currentConfig.labelOrder) {
    currentConfig.labelOrder = {};
  }
  
  currentConfig.labelOrder.orderedLabelIds = orderedLabelNames;
  currentConfig.labelOrder.lastModified = Date.now();
  
  console.log('Label order updated:', orderedLabelNames);
}

/**
 * 更新标签自定义名称（实时更新到配置中）
 */
function updateLabelCustomName(originalName, customName) {
  if (!currentConfig.customLabels) {
    currentConfig.customLabels = {};
  }
  
  if (customName && customName.trim()) {
    currentConfig.customLabels[originalName] = {
      originalName: originalName,
      customName: customName.trim(),
      isVisible: true,
      sortOrder: Object.keys(currentConfig.customLabels).length + 1
    };
  } else {
    delete currentConfig.customLabels[originalName];
  }
  
  console.log('Label custom name updated:', originalName, '->', customName);
}

/**
 * 保存标签自定义名称（向后兼容，现在只是更新配置）
 */
window.saveLabelCustomName = function(originalName) {
  const input = document.querySelector(`input[data-label-name="${originalName}"]`);
  if (!input) return;
  
  updateLabelCustomName(originalName, input.value);
  markUnsavedChanges();
};

/**
 * 重置标签自定义名称
 */
window.resetLabelCustomName = function(originalName) {
  const input = document.querySelector(`input[data-label-name="${originalName}"]`);
  if (!input) return;
  
  input.value = '';
  updateLabelCustomName(originalName, '');
  markUnsavedChanges();
};

/**
 * 原resetLabelCustomName函数内容（备用）
 */
function resetLabelCustomNameLegacy(originalName) {
  const input = document.querySelector(`input[data-label-name="${originalName}"]`);
  if (!input) return;
  
  input.value = '';
  
  if (currentConfig.customLabels && currentConfig.customLabels[originalName]) {
    delete currentConfig.customLabels[originalName];
    markUnsavedChanges();
  }
};

/**
 * 过滤标签列表
 */
function filterLabels(searchTerm) {
  const labelItems = document.querySelectorAll('.label-item');
  const labelSections = document.querySelectorAll('.label-section');
  const term = searchTerm.toLowerCase();
  
  let hasVisibleUserLabels = false;
  let hasVisibleSystemLabels = false;
  
  labelItems.forEach(item => {
    const originalName = item.querySelector('.label-original').textContent.toLowerCase();
    const customInput = item.querySelector('input');
    const customName = customInput.value.toLowerCase();
    const labelType = item.getAttribute('data-label-type');
    
    const matches = originalName.includes(term) || customName.includes(term);
    item.style.display = matches ? 'flex' : 'none';
    
    if (matches) {
      if (labelType === 'user') {
        hasVisibleUserLabels = true;
      } else if (labelType === 'system') {
        hasVisibleSystemLabels = true;
      }
    }
  });
  
  // 显示或隐藏分组标题
  labelSections.forEach(section => {
    const title = section.querySelector('.label-section-title');
    if (title) {
      if (title.textContent.includes('User') && !hasVisibleUserLabels) {
        section.style.display = 'none';
      } else if (title.textContent.includes('System') && !hasVisibleSystemLabels) {
        section.style.display = 'none';
      } else {
        section.style.display = 'block';
      }
    }
  });
}

/**
 * 保存所有更改
 */
async function saveAllChanges() {
  if (!hasUnsavedChanges) {
    showSuccess('No changes to save');
    return;
  }
  
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';
  
  try {
    // 保存用户配置
    await saveConfiguration(currentConfig.userConfig);
    
    // 保存自定义标签
    await saveCustomLabels(currentConfig.customLabels || {});
    
    // 保存标签顺序
    if (currentConfig.labelOrder && currentConfig.labelOrder.orderedLabelIds) {
      await saveLabelOrder(currentConfig.labelOrder.orderedLabelIds);
    }
    
    // 保存成功后刷新Gmail页面
    await refreshGmailPages();
    
    clearUnsavedChanges();
    showSuccess('Settings saved successfully. Gmail pages have been refreshed.');
    
  } catch (error) {
    console.error('Error saving settings:', error);
    showError('Failed to save settings: ' + error.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Changes';
  }
}

/**
 * 保存配置到后台
 */
async function saveConfiguration(config) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ 
      action: 'saveConfig', 
      config: config 
    }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      
      if (response.success) {
        resolve();
      } else {
        reject(new Error(response.error || 'Failed to save configuration'));
      }
    });
  });
}

/**
 * 保存自定义标签
 */
async function saveCustomLabels(customLabels) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ 
      action: 'saveCustomLabels', 
      customLabels: customLabels 
    }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      
      if (response.success) {
        resolve();
      } else {
        reject(new Error(response.error || 'Failed to save custom labels'));
      }
    });
  });
}

/**
 * 保存标签顺序
 */
async function saveLabelOrder(orderedLabelIds) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ 
      action: 'saveLabelOrder', 
      labelOrder: orderedLabelIds 
    }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      
      if (response.success) {
        resolve();
      } else {
        reject(new Error(response.error || 'Failed to save label order'));
      }
    });
  });
}

/**
 * 刷新所有Gmail页面
 */
async function refreshGmailPages() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ 
      action: 'refreshGmailPages'
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Failed to refresh Gmail pages:', chrome.runtime.lastError);
        resolve(); // 不阻塞保存流程
        return;
      }
      
      if (response && response.success) {
        console.log('Gmail pages refreshed successfully');
        resolve();
      } else {
        console.warn('Failed to refresh Gmail pages:', response?.error || 'Unknown error');
        resolve(); // 不阻塞保存流程
      }
    });
  });
}

/**
 * 重置为默认设置
 */
async function resetToDefaults() {
  if (!confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
    return;
  }
  
  // 重置配置为默认值
  currentConfig = {
    userConfig: {
      autoApplyLabels: true,
      showConfirmation: false,
      requireConfirmation: false,
      notificationStyle: 'popup',
      enableDragAndDrop: true
    },
    customLabels: {},
    labelOrder: {
      orderedLabelIds: [],
      lastModified: Date.now()
    }
  };
  
  // 更新UI
  updateUI();
  
  // 直接保存并刷新Gmail，让用户立刻看到恢复效果
  try {
    await saveConfiguration(currentConfig.userConfig);
    await saveCustomLabels({});
    await saveLabelOrder([]);
    await refreshGmailPages();
    // 等待Gmail刷新完成后重新拉取标签，避免列表残留旧名字
    await new Promise(r => setTimeout(r, 1200));
    await loadGmailLabels();
    updateLabelList();
    clearUnsavedChanges();
    showSuccess('Settings reset to defaults and applied to Gmail.');
  } catch (e) {
    // 如果自动保存失败，则仍允许用户手动保存
    markUnsavedChanges();
    showError('Failed to auto-apply defaults. Please click "Save Changes". ' + e.message);
  }
}

/**
 * 显示成功消息
 */
function showSuccess(message) {
  console.log('Success:', message);
  // 可以后续添加toast通知
}

/**
 * 显示错误消息
 */
function showError(message) {
  console.error('Error:', message);
  alert('Error: ' + message); // 临时使用alert，后续可改进为更好的UI
}