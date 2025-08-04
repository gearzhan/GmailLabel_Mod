/**
 * 弹窗界面逻辑
 * 处理扩展弹窗的用户交互和数据显示
 */

// 导入常量（注意：在popup中需要使用不同的导入方式）
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
 * 弹窗管理类
 */
class PopupManager {
  constructor() {
    this.settings = null;
    this.labelCache = null;
    this.activityData = [];
    this.isLoading = false;
    
    this.init();
  }

  /**
   * 初始化弹窗
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
      
      console.log('[Popup] Initialized successfully');
    } catch (error) {
      console.error('[Popup] Initialization failed:', error);
      this.showError('Failed to initialize popup');
    }
  }

  /**
   * 绑定事件监听器
   */
  bindEventListeners() {
    // 设置复选框事件
    const autoApplyCheckbox = document.getElementById('autoApplyLabels');
    const notificationsCheckbox = document.getElementById('showNotifications');
    
    if (autoApplyCheckbox) {
      autoApplyCheckbox.addEventListener('change', (e) => {
        this.updateSetting('autoApplyLabels', e.target.checked);
      });
    }
    
    if (notificationsCheckbox) {
      notificationsCheckbox.addEventListener('change', (e) => {
        this.updateSetting('showNotifications', e.target.checked);
      });
    }
    
    // 按钮事件
    const openOptionsBtn = document.getElementById('openOptions');
    const refreshBtn = document.getElementById('refreshData');
    
    if (openOptionsBtn) {
      openOptionsBtn.addEventListener('click', () => {
        this.openOptionsPage();
      });
    }
    
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.refreshData();
      });
    }
    
    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.refreshData();
      }
    });
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
        customLabelNames: {},
        labelOrder: []
      });
      
      // 加载标签缓存
      this.labelCache = await this.getStorageData(STORAGE_KEYS.LABEL_CACHE, {});
      
      // 加载活动数据
      await this.loadActivityData();
      
      console.log('[Popup] Data loaded:', {
        settings: this.settings,
        labelCacheSize: Object.keys(this.labelCache).length
      });
    } catch (error) {
      console.error('[Popup] Failed to load data:', error);
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
      console.error(`[Popup] Failed to get storage data for key: ${key}`, error);
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
      console.error(`[Popup] Failed to set storage data for key: ${key}`, error);
      return false;
    }
  }

  /**
   * 加载活动数据
   */
  async loadActivityData() {
    try {
      // 从标签缓存中生成活动数据
      this.activityData = Object.entries(this.labelCache)
        .filter(([id, data]) => data.lastApplied)
        .sort((a, b) => (b[1].lastApplied || 0) - (a[1].lastApplied || 0))
        .slice(0, 5)
        .map(([id, data]) => ({
          id,
          name: data.name,
          time: data.lastApplied,
          count: data.appliedCount || 1
        }));
    } catch (error) {
      console.error('[Popup] Failed to load activity data:', error);
      this.activityData = [];
    }
  }

  /**
   * 更新界面
   */
  updateUI() {
    try {
      this.updateSettings();
      this.updateStatistics();
      this.updateActivity();
      this.updateStatus();
    } catch (error) {
      console.error('[Popup] Failed to update UI:', error);
    }
  }

  /**
   * 更新设置界面
   */
  updateSettings() {
    const autoApplyCheckbox = document.getElementById('autoApplyLabels');
    const notificationsCheckbox = document.getElementById('showNotifications');
    
    if (autoApplyCheckbox && this.settings) {
      autoApplyCheckbox.checked = this.settings.autoApplyLabels;
    }
    
    if (notificationsCheckbox && this.settings) {
      notificationsCheckbox.checked = this.settings.showNotifications;
    }
  }

  /**
   * 更新统计信息
   */
  updateStatistics() {
    try {
      const totalLabelsEl = document.getElementById('totalLabels');
      const customLabelsEl = document.getElementById('customLabels');
      const appliedTodayEl = document.getElementById('appliedToday');
      
      const totalLabels = Object.keys(this.labelCache).length;
      const customLabels = Object.keys(this.settings?.customLabelNames || {}).length;
      const appliedToday = this.getAppliedTodayCount();
      
      if (totalLabelsEl) {
        this.animateNumber(totalLabelsEl, totalLabels);
      }
      
      if (customLabelsEl) {
        this.animateNumber(customLabelsEl, customLabels);
      }
      
      if (appliedTodayEl) {
        this.animateNumber(appliedTodayEl, appliedToday);
      }
    } catch (error) {
      console.error('[Popup] Failed to update statistics:', error);
    }
  }

  /**
   * 获取今日应用的标签数量
   * @returns {number} 今日应用数量
   */
  getAppliedTodayCount() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    return Object.values(this.labelCache)
      .filter(data => data.lastApplied && data.lastApplied >= todayTimestamp)
      .reduce((sum, data) => sum + (data.appliedCount || 0), 0);
  }

  /**
   * 数字动画效果
   * @param {Element} element - 目标元素
   * @param {number} targetValue - 目标值
   */
  animateNumber(element, targetValue) {
    const currentValue = parseInt(element.textContent) || 0;
    const increment = Math.ceil((targetValue - currentValue) / 10);
    
    if (currentValue !== targetValue) {
      element.textContent = Math.min(currentValue + increment, targetValue);
      
      if (parseInt(element.textContent) < targetValue) {
        setTimeout(() => this.animateNumber(element, targetValue), 50);
      }
    }
  }

  /**
   * 更新活动列表
   */
  updateActivity() {
    const activityList = document.getElementById('activityList');
    
    if (!activityList) return;
    
    if (this.activityData.length === 0) {
      // 显示占位符
      activityList.innerHTML = `
        <div class="activity-item placeholder">
          <div class="activity-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M11,9H13V7H11M11,17H13V11H11V17Z" />
            </svg>
          </div>
          <div class="activity-content">
            <div class="activity-text">No recent activity</div>
            <div class="activity-time">Start using Gmail to see activity here</div>
          </div>
        </div>
      `;
      return;
    }
    
    // 生成活动项目
    const activityHTML = this.activityData.map(activity => `
      <div class="activity-item">
        <div class="activity-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9,10H7V12H9V10M13,10H11V12H13V10M17,10H15V12H17V10M19,3H18V1H16V3H8V1H6V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V8H19V19Z" />
          </svg>
        </div>
        <div class="activity-content">
          <div class="activity-text">Applied "${this.escapeHtml(activity.name)}"</div>
          <div class="activity-time">${this.formatTime(activity.time)} • ${activity.count} time${activity.count > 1 ? 's' : ''}</div>
        </div>
      </div>
    `).join('');
    
    activityList.innerHTML = activityHTML;
  }

  /**
   * 更新状态指示器
   */
  updateStatus() {
    const statusIndicator = document.getElementById('statusIndicator');
    
    if (statusIndicator) {
      const statusText = statusIndicator.querySelector('.status-text');
      const statusDot = statusIndicator.querySelector('.status-dot');
      
      if (this.isLoading) {
        statusText.textContent = 'Loading...';
        statusDot.style.background = '#fbbc04';
      } else {
        statusText.textContent = 'Ready';
        statusDot.style.background = '#34a853';
      }
    }
  }

  /**
   * 更新设置
   * @param {string} key - 设置键
   * @param {any} value - 设置值
   */
  async updateSetting(key, value) {
    try {
      this.settings[key] = value;
      
      // 保存到存储
      await this.setStorageData(STORAGE_KEYS.USER_SETTINGS, this.settings);
      
      // 通知后台脚本
      await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.SETTINGS_UPDATED,
        data: { [key]: value }
      });
      
      console.log(`[Popup] Setting updated: ${key} = ${value}`);
    } catch (error) {
      console.error('[Popup] Failed to update setting:', error);
    }
  }

  /**
   * 刷新数据
   */
  async refreshData() {
    try {
      this.showLoading(true);
      
      await this.loadData();
      this.updateUI();
      
      // 显示刷新成功提示
      this.showToast('Data refreshed successfully');
      
      this.showLoading(false);
    } catch (error) {
      console.error('[Popup] Failed to refresh data:', error);
      this.showError('Failed to refresh data');
    }
  }

  /**
   * 打开选项页面
   */
  openOptionsPage() {
    chrome.runtime.openOptionsPage();
    window.close();
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
    
    this.updateStatus();
  }

  /**
   * 显示错误信息
   * @param {string} message - 错误消息
   */
  showError(message) {
    this.showToast(message, 'error');
    this.showLoading(false);
  }

  /**
   * 显示提示信息
   * @param {string} message - 提示消息
   * @param {string} type - 提示类型
   */
  showToast(message, type = 'success') {
    // 创建简单的提示
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      background: ${type === 'error' ? '#ea4335' : '#34a853'};
      color: white;
      border-radius: 6px;
      font-size: 13px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
          toast.parentNode.removeChild(toast);
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

  /**
   * 格式化时间
   * @param {number} timestamp - 时间戳
   * @returns {string} 格式化的时间
   */
  formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) { // 1分钟内
      return 'Just now';
    } else if (diff < 3600000) { // 1小时内
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diff < 86400000) { // 24小时内
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else { // 超过24小时
      const date = new Date(timestamp);
      return date.toLocaleDateString();
    }
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

// 初始化弹窗
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});