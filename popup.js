// Gmail标签管理器 - 弹窗脚本
// 处理弹窗界面的交互和配置管理

/**
 * 全局变量
 */
let currentConfig = null;

/**
 * 页面加载完成后初始化
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup loaded');
  
  try {
    await loadConfiguration();
    setupEventListeners();
    updateUI();
    checkGmailStatus();
  } catch (error) {
    console.error('Error initializing popup:', error);
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
 * 设置事件监听器
 */
function setupEventListeners() {
  // 切换开关事件
  const dragDropToggle = document.getElementById('dragDropToggle');
  
  dragDropToggle.addEventListener('click', () => {
    toggleSetting('enableDragAndDrop', dragDropToggle);
  });
  
  // 按钮事件
  document.getElementById('openOptions').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
  
  document.getElementById('refreshConfig').addEventListener('click', async () => {
    try {
      await loadConfiguration();
      updateUI();
      showSuccess('Configuration refreshed');
    } catch (error) {
      console.error('Error refreshing config:', error);
      showError('Failed to refresh configuration');
    }
  });
}

/**
 * 切换设置选项
 */
async function toggleSetting(settingKey, toggleElement) {
  if (!currentConfig || !currentConfig.userConfig) {
    showError('Configuration not loaded');
    return;
  }
  
  // 切换设置值
  currentConfig.userConfig[settingKey] = !currentConfig.userConfig[settingKey];
  
  // 更新UI
  updateToggleState(toggleElement, currentConfig.userConfig[settingKey]);
  
  // 保存配置
  try {
    await saveConfiguration(currentConfig.userConfig);
    console.log(`Setting ${settingKey} updated to:`, currentConfig.userConfig[settingKey]);
  } catch (error) {
    console.error('Error saving configuration:', error);
    // 回滚UI状态
    currentConfig.userConfig[settingKey] = !currentConfig.userConfig[settingKey];
    updateToggleState(toggleElement, currentConfig.userConfig[settingKey]);
    showError('Failed to save setting');
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
 * 更新UI界面
 */
function updateUI() {
  if (!currentConfig) {
    return;
  }
  
  // 隐藏加载界面，显示内容
  document.getElementById('loading').style.display = 'none';
  document.getElementById('content').style.display = 'block';
  
  // 更新切换开关状态
  const userConfig = currentConfig.userConfig || {};
  
  updateToggleState(
    document.getElementById('dragDropToggle'),
    userConfig.enableDragAndDrop
  );
  
  // 更新统计信息
  updateStatistics();
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
 * 更新统计信息
 */
function updateStatistics() {
  if (!currentConfig) return;
  
  // 自定义标签数量
  const customLabelsCount = Object.keys(currentConfig.customLabels || {}).length;
  document.getElementById('customLabelsCount').textContent = customLabelsCount;
  
  // 重排序标签数量
  const reorderedCount = currentConfig.labelOrder?.orderedLabelIds?.length || 0;
  document.getElementById('reorderedLabelsCount').textContent = reorderedCount;
  
  // 今日自动应用次数（暂时显示0，后续版本实现）
  document.getElementById('autoAppliedCount').textContent = '0';
}

/**
 * 检查Gmail连接状态
 */
async function checkGmailStatus() {
  try {
    // 查询Gmail标签页
    const tabs = await chrome.tabs.query({ url: 'https://mail.google.com/*' });
    
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    
    if (tabs.length > 0) {
      statusIndicator.classList.add('active');
      statusIndicator.classList.remove('inactive');
      statusText.textContent = `Connected to Gmail (${tabs.length} tab${tabs.length > 1 ? 's' : ''})`;
    } else {
      statusIndicator.classList.add('inactive');
      statusIndicator.classList.remove('active');
      statusText.textContent = 'No Gmail tabs detected';
    }
  } catch (error) {
    console.error('Error checking Gmail status:', error);
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    
    statusIndicator.classList.add('inactive');
    statusIndicator.classList.remove('active');
    statusText.textContent = 'Unable to check Gmail status';
  }
}

/**
 * 显示成功消息
 */
function showSuccess(message) {
  // 简单的成功提示（可以后续改进为toast通知）
  console.log('Success:', message);
}

/**
 * 显示错误消息
 */
function showError(message) {
  // 简单的错误提示（可以后续改进为toast通知）
  console.error('Error:', message);
  
  // 临时在状态栏显示错误
  const statusText = document.getElementById('statusText');
  if (statusText) {
    const originalText = statusText.textContent;
    statusText.textContent = `Error: ${message}`;
    statusText.style.color = '#ea4335';
    
    setTimeout(() => {
      statusText.textContent = originalText;
      statusText.style.color = '#5f6368';
    }, 3000);
  }
}