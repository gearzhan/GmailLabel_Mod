/**
 * 选项页面逻辑
 * 处理扩展设置页面的用户交互和数据管理
 */

// 导入常量
const MESSAGE_TYPES = {
  LABEL_APPLIED: 'labelApplied',
  LABEL_DETECTED: 'labelDetected',
  SETTINGS_UPDATED: 'settingsUpdated',
  CACHE_UPDATED: 'cacheUpdated'
};

const STORAGE_KEYS = {
  CUSTOM_LABELS: 'customLabels',
  LABEL_ORDER: 'labelOrder',
  USER_SETTINGS: 'userSettings',
  LABEL_CACHE: 'labelCache'
};

/**
 * 选项页面管理类
 */
class OptionsManager {
  constructor() {
    this.settings = null;
    this.customLabels = {};
    this.labelOrder = [];
    this.labelCache = {};
    this.isLoading = false;
    this.isDirty = false;
    
    this.init();
  }

  /**
   * 初始化选项页面
   */
  async init() {
    try {
      this.showLoading(true);
      
      // 绑定事件监听器
      this.bindEventListeners();
      
      // 加载数据
      await this.loadData();
      
      // 更新界面
      this.updateUI();
      
      this.showLoading(false);
      
      console.log('[Options] Initialized successfully');
    } catch (error) {
      console.error('[Options] Initialization failed:', error);
      this.showError('Failed to initialize options page');
    }
  }

  /**
   * 绑定事件监听器
   */
  bindEventListeners() {
    // 标签页切换
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });
    
    // 设置控件事件
    this.bindSettingControls();
    
    // 按钮事件
    this.bindButtonEvents();
    
    // 模态框事件
    this.bindModalEvents();
    
    // 拖拽事件
    this.bindDragEvents();
    
    // 键盘快捷键
    this.bindKeyboardEvents();
    
    // 页面离开前保存
    window.addEventListener('beforeunload', (e) => {
      if (this.isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    });
  }

  /**
   * 绑定设置控件事件
   */
  bindSettingControls() {
    // 复选框设置
    const checkboxes = [
      'autoApplyLabels',
      'showNotifications',
      'enableDebugMode'
    ];
    
    checkboxes.forEach(id => {
      const checkbox = document.getElementById(id);
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          this.updateSetting(id, e.target.checked);
        });
      }
    });
    
    // 数字输入框设置
    const numberInputs = [
      'cacheTimeout',
      'maxCacheSize'
    ];
    
    numberInputs.forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('change', (e) => {
          const value = parseInt(e.target.value);
          if (!isNaN(value)) {
            this.updateSetting(id, value);
          }
        });
      }
    });
  }

  /**
   * 绑定按钮事件
   */
  bindButtonEvents() {
    // 保存设置
    const saveBtn = document.getElementById('saveSettings');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveAllSettings();
      });
    }
    
    // 添加自定义标签
    const addLabelBtn = document.getElementById('addCustomLabel');
    if (addLabelBtn) {
      addLabelBtn.addEventListener('click', () => {
        this.showCustomLabelModal();
      });
    }
    
    // 重置标签顺序
    const resetOrderBtn = document.getElementById('resetLabelOrder');
    if (resetOrderBtn) {
      resetOrderBtn.addEventListener('click', () => {
        this.resetLabelOrder();
      });
    }
    
    // 数据管理按钮
    this.bindDataManagementButtons();
  }

  /**
   * 绑定数据管理按钮事件
   */
  bindDataManagementButtons() {
    // 导出设置
    const exportBtn = document.getElementById('exportSettings');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportSettings();
      });
    }
    
    // 导入设置
    const importBtn = document.getElementById('importSettings');
    const importFile = document.getElementById('importFile');
    
    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => {
        importFile.click();
      });
      
      importFile.addEventListener('change', (e) => {
        this.importSettings(e.target.files[0]);
      });
    }
    
    // 清除缓存
    const clearCacheBtn = document.getElementById('clearCache');
    if (clearCacheBtn) {
      clearCacheBtn.addEventListener('click', () => {
        this.clearCache();
      });
    }
    
    // 重置所有设置
    const resetBtn = document.getElementById('resetSettings');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetAllSettings();
      });
    }
  }

  /**
   * 绑定模态框事件
   */
  bindModalEvents() {
    const modal = document.getElementById('customLabelModal');
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelModal');
    const saveBtn = document.getElementById('saveCustomLabel');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideCustomLabelModal();
      });
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.hideCustomLabelModal();
      });
    }
    
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveCustomLabel();
      });
    }
    
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideCustomLabelModal();
        }
      });
    }
  }

  /**
   * 绑定拖拽事件
   */
  bindDragEvents() {
    // 标签顺序拖拽将在updateLabelOrder方法中动态绑定
  }

  /**
   * 绑定键盘事件
   */
  bindKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + S 保存
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveAllSettings();
      }
      
      // Escape 关闭模态框
      if (e.key === 'Escape') {
        this.hideCustomLabelModal();
      }
    });
  }

  /**
   * 切换标签页
   * @param {string} tabName - 标签页名称
   */
  switchTab(tabName) {
    // 更新导航标签
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // 更新内容区域
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
    
    // 如果切换到标签页，刷新标签数据
    if (tabName === 'labels') {
      this.updateCustomLabels();
      this.updateLabelOrder();
    }
  }

  /**
   * 加载数据
   */
  async loadData() {
    try {
      // 加载用户设置
      this.settings = await this.getStorageData(STORAGE_KEYS.USER_SETTINGS, {
        autoApplyLabels: true,
        showNotifications: true,
        enableDebugMode: false,
        cacheTimeout: 30,
        maxCacheSize: 1000,
        customLabelNames: {},
        labelOrder: []
      });
      
      // 加载自定义标签
      this.customLabels = await this.getStorageData(STORAGE_KEYS.CUSTOM_LABELS, {});
      
      // 加载标签顺序
      this.labelOrder = await this.getStorageData(STORAGE_KEYS.LABEL_ORDER, []);
      
      // 加载标签缓存
      this.labelCache = await this.getStorageData(STORAGE_KEYS.LABEL_CACHE, {});
      
      console.log('[Options] Data loaded:', {
        settings: this.settings,
        customLabelsCount: Object.keys(this.customLabels).length,
        labelOrderCount: this.labelOrder.length,
        labelCacheSize: Object.keys(this.labelCache).length
      });
    } catch (error) {
      console.error('[Options] Failed to load data:', error);
      throw error;
    }
  }

  /**
   * 从存储中获取数据
   * @param {string} key - 存储键
   * @param {any} defaultValue - 默认值
   * @returns {Promise<any>} 存储的数据
   */
  async getStorageData(key, defaultValue) {
    try {
      const result = await chrome.storage.local.get([key]);
      return result[key] !== undefined ? result[key] : defaultValue;
    } catch (error) {
      console.error(`[Options] Failed to get storage data for key: ${key}`, error);
      return defaultValue;
    }
  }

  /**
   * 设置存储数据
   * @param {string} key - 存储键
   * @param {any} value - 要存储的值
   * @returns {Promise<boolean>} 是否成功
   */
  async setStorageData(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
      return true;
    } catch (error) {
      console.error(`[Options] Failed to set storage data for key: ${key}`, error);
      return false;
    }
  }

  /**
   * 更新界面
   */
  updateUI() {
    this.updateGeneralSettings();
    this.updateCustomLabels();
    this.updateLabelOrder();
    this.updateAboutInfo();
  }

  /**
   * 更新通用设置界面
   */
  updateGeneralSettings() {
    if (!this.settings) return;
    
    // 更新复选框
    const checkboxes = [
      'autoApplyLabels',
      'showNotifications',
      'enableDebugMode'
    ];
    
    checkboxes.forEach(id => {
      const checkbox = document.getElementById(id);
      if (checkbox && this.settings[id] !== undefined) {
        checkbox.checked = this.settings[id];
      }
    });
    
    // 更新数字输入框
    const numberInputs = [
      'cacheTimeout',
      'maxCacheSize'
    ];
    
    numberInputs.forEach(id => {
      const input = document.getElementById(id);
      if (input && this.settings[id] !== undefined) {
        input.value = this.settings[id];
      }
    });
  }

  /**
   * 更新自定义标签列表
   */
  updateCustomLabels() {
    const container = document.getElementById('customLabelsList');
    const emptyState = document.getElementById('noCustomLabels');
    
    if (!container || !emptyState) return;
    
    const customLabels = { ...this.customLabels, ...this.settings?.customLabelNames };
    const labelEntries = Object.entries(customLabels);
    
    if (labelEntries.length === 0) {
      container.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }
    
    container.style.display = 'block';
    emptyState.style.display = 'none';
    
    container.innerHTML = labelEntries.map(([originalName, customName]) => `
      <div class="custom-label-item" data-original="${this.escapeHtml(originalName)}">
        <div class="custom-label-info">
          <div class="custom-label-original">${this.escapeHtml(originalName)}</div>
          <div class="custom-label-custom">${this.escapeHtml(customName)}</div>
        </div>
        <div class="custom-label-actions">
          <button class="btn-icon edit-label" title="Edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
            </svg>
          </button>
          <button class="btn-icon delete-label" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
            </svg>
          </button>
        </div>
      </div>
    `).join('');
    
    // 绑定编辑和删除事件
    container.querySelectorAll('.edit-label').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = e.target.closest('.custom-label-item');
        const originalName = item.dataset.original;
        this.editCustomLabel(originalName);
      });
    });
    
    container.querySelectorAll('.delete-label').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = e.target.closest('.custom-label-item');
        const originalName = item.dataset.original;
        this.deleteCustomLabel(originalName);
      });
    });
  }

  /**
   * 更新标签顺序列表
   */
  updateLabelOrder() {
    const container = document.getElementById('labelOrderList');
    const emptyState = document.getElementById('noLabelsOrder');
    
    if (!container || !emptyState) return;
    
    // 合并缓存中的标签和用户设置的顺序
    const allLabels = new Set([
      ...this.labelOrder,
      ...Object.keys(this.labelCache)
    ]);
    
    if (allLabels.size === 0) {
      container.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }
    
    container.style.display = 'block';
    emptyState.style.display = 'none';
    
    const sortedLabels = Array.from(allLabels).sort((a, b) => {
      const indexA = this.labelOrder.indexOf(a);
      const indexB = this.labelOrder.indexOf(b);
      
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    
    container.innerHTML = sortedLabels.map((labelId, index) => {
      const labelData = this.labelCache[labelId] || { name: labelId };
      const customName = this.customLabels[labelId] || this.settings?.customLabelNames?.[labelId];
      const displayName = customName || labelData.name || labelId;
      
      return `
        <div class="label-order-item" draggable="true" data-label-id="${this.escapeHtml(labelId)}" data-index="${index}">
          <div class="drag-handle">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9,3H11V5H9V3M13,3H15V5H13V3M9,7H11V9H9V7M13,7H15V9H13V7M9,11H11V13H9V11M13,11H15V13H13V11M9,15H11V17H9V15M13,15H15V17H13V15M9,19H11V21H9V19M13,19H15V21H13V19Z" />
            </svg>
          </div>
          <div class="label-order-info">
            <div class="label-order-name">${this.escapeHtml(displayName)}</div>
            <div class="label-order-id">${this.escapeHtml(labelId)}</div>
          </div>
        </div>
      `;
    }).join('');
    
    // 绑定拖拽事件
    this.bindLabelDragEvents(container);
  }

  /**
   * 绑定标签拖拽事件
   * @param {Element} container - 容器元素
   */
  bindLabelDragEvents(container) {
    let draggedElement = null;
    let draggedIndex = -1;
    
    container.querySelectorAll('.label-order-item').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        draggedElement = e.target;
        draggedIndex = parseInt(e.target.dataset.index);
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      
      item.addEventListener('dragend', (e) => {
        e.target.classList.remove('dragging');
        container.querySelectorAll('.label-order-item').forEach(el => {
          el.classList.remove('drag-over');
        });
        draggedElement = null;
        draggedIndex = -1;
      });
      
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        if (draggedElement && e.target !== draggedElement) {
          e.target.classList.add('drag-over');
        }
      });
      
      item.addEventListener('dragleave', (e) => {
        e.target.classList.remove('drag-over');
      });
      
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        e.target.classList.remove('drag-over');
        
        if (draggedElement && e.target !== draggedElement) {
          const targetIndex = parseInt(e.target.dataset.index);
          this.reorderLabels(draggedIndex, targetIndex);
        }
      });
    });
  }

  /**
   * 重新排序标签
   * @param {number} fromIndex - 源索引
   * @param {number} toIndex - 目标索引
   */
  reorderLabels(fromIndex, toIndex) {
    const allLabels = Array.from(new Set([
      ...this.labelOrder,
      ...Object.keys(this.labelCache)
    ]));
    
    // 移动元素
    const [movedLabel] = allLabels.splice(fromIndex, 1);
    allLabels.splice(toIndex, 0, movedLabel);
    
    // 更新标签顺序
    this.labelOrder = allLabels;
    this.markDirty();
    
    // 重新渲染
    this.updateLabelOrder();
  }

  /**
   * 更新关于信息
   */
  updateAboutInfo() {
    // 扩展版本
    const versionEl = document.getElementById('extensionVersion');
    if (versionEl) {
      versionEl.textContent = chrome.runtime.getManifest().version;
    }
    
    // 最后更新时间
    const lastUpdatedEl = document.getElementById('lastUpdated');
    if (lastUpdatedEl) {
      const installTime = chrome.runtime.getManifest().version_name || 'Unknown';
      lastUpdatedEl.textContent = new Date().toLocaleDateString();
    }
    
    // 缓存大小
    const cacheSizeEl = document.getElementById('cacheSize');
    if (cacheSizeEl) {
      const cacheSize = Object.keys(this.labelCache).length;
      cacheSizeEl.textContent = `${cacheSize} labels`;
    }
    
    // 总标签数
    const totalLabelsEl = document.getElementById('totalLabelsCount');
    if (totalLabelsEl) {
      const totalLabels = Object.keys(this.labelCache).length;
      totalLabelsEl.textContent = totalLabels.toString();
    }
  }

  /**
   * 更新设置
   * @param {string} key - 设置键
   * @param {any} value - 设置值
   */
  updateSetting(key, value) {
    if (!this.settings) {
      this.settings = {};
    }
    
    this.settings[key] = value;
    this.markDirty();
    
    console.log(`[Options] Setting updated: ${key} = ${value}`);
  }

  /**
   * 标记为已修改
   */
  markDirty() {
    this.isDirty = true;
    
    // 更新保存按钮状态
    const saveBtn = document.getElementById('saveSettings');
    if (saveBtn) {
      saveBtn.textContent = 'Save Changes *';
      saveBtn.classList.add('btn-warning');
    }
  }

  /**
   * 标记为已保存
   */
  markClean() {
    this.isDirty = false;
    
    // 更新保存按钮状态
    const saveBtn = document.getElementById('saveSettings');
    if (saveBtn) {
      saveBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z" />
        </svg>
        Save Settings
      `;
      saveBtn.classList.remove('btn-warning');
    }
  }

  /**
   * 保存所有设置
   */
  async saveAllSettings() {
    try {
      this.showLoading(true);
      
      // 保存用户设置
      await this.setStorageData(STORAGE_KEYS.USER_SETTINGS, this.settings);
      
      // 保存自定义标签
      await this.setStorageData(STORAGE_KEYS.CUSTOM_LABELS, this.customLabels);
      
      // 保存标签顺序
      await this.setStorageData(STORAGE_KEYS.LABEL_ORDER, this.labelOrder);
      
      // 通知后台脚本
      await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.SETTINGS_UPDATED,
        data: this.settings
      });
      
      this.markClean();
      this.showSuccess('Settings saved successfully');
      
      console.log('[Options] All settings saved');
    } catch (error) {
      console.error('[Options] Failed to save settings:', error);
      this.showError('Failed to save settings');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * 显示自定义标签模态框
   * @param {string} originalName - 原始标签名（编辑时使用）
   */
  showCustomLabelModal(originalName = '') {
    const modal = document.getElementById('customLabelModal');
    const title = document.getElementById('modalTitle');
    const originalInput = document.getElementById('originalLabelName');
    const customInput = document.getElementById('customLabelName');
    
    if (!modal || !title || !originalInput || !customInput) return;
    
    // 设置模态框标题和内容
    if (originalName) {
      title.textContent = 'Edit Custom Label';
      originalInput.value = originalName;
      originalInput.disabled = true;
      customInput.value = this.customLabels[originalName] || this.settings?.customLabelNames?.[originalName] || '';
    } else {
      title.textContent = 'Add Custom Label';
      originalInput.value = '';
      originalInput.disabled = false;
      customInput.value = '';
    }
    
    modal.classList.add('show');
    originalInput.focus();
  }

  /**
   * 隐藏自定义标签模态框
   */
  hideCustomLabelModal() {
    const modal = document.getElementById('customLabelModal');
    if (modal) {
      modal.classList.remove('show');
    }
  }

  /**
   * 保存自定义标签
   */
  saveCustomLabel() {
    const originalInput = document.getElementById('originalLabelName');
    const customInput = document.getElementById('customLabelName');
    
    if (!originalInput || !customInput) return;
    
    const originalName = originalInput.value.trim();
    const customName = customInput.value.trim();
    
    if (!originalName || !customName) {
      this.showError('Both fields are required');
      return;
    }
    
    // 保存到自定义标签
    this.customLabels[originalName] = customName;
    
    // 同时更新设置中的自定义标签名
    if (!this.settings.customLabelNames) {
      this.settings.customLabelNames = {};
    }
    this.settings.customLabelNames[originalName] = customName;
    
    this.markDirty();
    this.updateCustomLabels();
    this.hideCustomLabelModal();
    
    this.showSuccess(`Custom label "${customName}" saved`);
  }

  /**
   * 编辑自定义标签
   * @param {string} originalName - 原始标签名
   */
  editCustomLabel(originalName) {
    this.showCustomLabelModal(originalName);
  }

  /**
   * 删除自定义标签
   * @param {string} originalName - 原始标签名
   */
  deleteCustomLabel(originalName) {
    if (confirm(`Are you sure you want to delete the custom label for "${originalName}"?`)) {
      delete this.customLabels[originalName];
      
      if (this.settings.customLabelNames) {
        delete this.settings.customLabelNames[originalName];
      }
      
      this.markDirty();
      this.updateCustomLabels();
      
      this.showSuccess('Custom label deleted');
    }
  }

  /**
   * 重置标签顺序
   */
  resetLabelOrder() {
    if (confirm('Are you sure you want to reset the label order to default?')) {
      this.labelOrder = [];
      this.markDirty();
      this.updateLabelOrder();
      
      this.showSuccess('Label order reset to default');
    }
  }

  /**
   * 导出设置
   */
  async exportSettings() {
    try {
      const exportData = {
        version: chrome.runtime.getManifest().version,
        timestamp: Date.now(),
        settings: this.settings,
        customLabels: this.customLabels,
        labelOrder: this.labelOrder
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gmail-label-modifier-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.showSuccess('Settings exported successfully');
    } catch (error) {
      console.error('[Options] Failed to export settings:', error);
      this.showError('Failed to export settings');
    }
  }

  /**
   * 导入设置
   * @param {File} file - 设置文件
   */
  async importSettings(file) {
    if (!file) return;
    
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      // 验证导入数据
      if (!importData.settings || !importData.version) {
        throw new Error('Invalid settings file format');
      }
      
      if (confirm('This will replace all current settings. Are you sure you want to continue?')) {
        this.settings = importData.settings;
        this.customLabels = importData.customLabels || {};
        this.labelOrder = importData.labelOrder || [];
        
        this.markDirty();
        this.updateUI();
        
        this.showSuccess('Settings imported successfully');
      }
    } catch (error) {
      console.error('[Options] Failed to import settings:', error);
      this.showError('Failed to import settings. Please check the file format.');
    }
  }

  /**
   * 清除缓存
   */
  async clearCache() {
    if (confirm('Are you sure you want to clear all cached data? This will not affect your settings.')) {
      try {
        await this.setStorageData(STORAGE_KEYS.LABEL_CACHE, {});
        this.labelCache = {};
        
        // 通知后台脚本
        await chrome.runtime.sendMessage({
          type: MESSAGE_TYPES.CACHE_UPDATED,
          data: {}
        });
        
        this.updateUI();
        this.showSuccess('Cache cleared successfully');
      } catch (error) {
        console.error('[Options] Failed to clear cache:', error);
        this.showError('Failed to clear cache');
      }
    }
  }

  /**
   * 重置所有设置
   */
  async resetAllSettings() {
    const confirmText = 'Are you sure you want to reset ALL settings to default? This cannot be undone.\n\nType "RESET" to confirm:';
    const userInput = prompt(confirmText);
    
    if (userInput === 'RESET') {
      try {
        this.showLoading(true);
        
        // 重置所有数据
        await chrome.storage.local.clear();
        
        // 重新初始化
        await this.loadData();
        this.updateUI();
        this.markClean();
        
        this.showSuccess('All settings have been reset to default');
      } catch (error) {
        console.error('[Options] Failed to reset settings:', error);
        this.showError('Failed to reset settings');
      } finally {
        this.showLoading(false);
      }
    }
  }

  /**
   * 显示/隐藏加载状态
   * @param {boolean} show - 是否显示
   */
  showLoading(show) {
    this.isLoading = show;
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    if (loadingOverlay) {
      if (show) {
        loadingOverlay.classList.add('show');
      } else {
        loadingOverlay.classList.remove('show');
      }
    }
  }

  /**
   * 显示成功消息
   * @param {string} message - 消息内容
   */
  showSuccess(message) {
    this.showToast(message, 'success');
  }

  /**
   * 显示错误消息
   * @param {string} message - 错误消息
   */
  showError(message) {
    this.showToast(message, 'error');
    this.showLoading(false);
  }

  /**
   * 显示提示消息
   * @param {string} message - 提示消息
   * @param {string} type - 消息类型
   */
  showToast(message, type = 'success') {
    // 创建提示元素
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 20px;
      background: ${type === 'error' ? '#ea4335' : '#34a853'};
      color: white;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      animation: slideIn 0.3s ease;
      max-width: 300px;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 自动移除
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 300);
      }
    }, 3000);
  }

  /**
   * 转义HTML字符
   * @param {string} text - 要转义的文本
   * @returns {string} 转义后的文本
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// 初始化选项页面
document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});