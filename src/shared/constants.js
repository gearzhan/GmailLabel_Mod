/**
 * 定义扩展中使用的所有常量
 */

// Gmail API 相关常量
const GMAIL_API = {
  BASE_URL: 'https://mail.google.com',
  ENDPOINTS: {
    LABELS: '/sync/u/0/i/s',
    THREADS: '/sync/u/0/i/tl',
    MESSAGES: '/sync/u/0/i/m'
  }
};

// 存储键名常量
const STORAGE_KEYS = {
  CUSTOM_LABELS: 'customLabels',
  LABEL_ORDER: 'labelOrder',
  USER_SETTINGS: 'userSettings',
  LABEL_CACHE: 'labelCache'
};

// 消息类型常量
const MESSAGE_TYPES = {
  LABEL_APPLIED: 'labelApplied',
  LABEL_DETECTED: 'labelDetected',
  SETTINGS_UPDATED: 'settingsUpdated',
  CACHE_UPDATED: 'cacheUpdated'
};

// DOM 选择器常量
const SELECTORS = {
  LABEL_CONTAINER: '[data-legacy-thread-id]',
  COMPOSE_WINDOW: '.nH .aO7',
  REPLY_BUTTON: '.T-I.J-J5-Ji.T-I-KE.L3',
  LABEL_LIST: '.aim .aZ6'
};

// 默认设置
const DEFAULT_SETTINGS = {
  autoApplyLabels: true,
  showNotifications: true,
  customLabelNames: {},
  labelOrder: []
};

// 调试模式
const DEBUG = true;

// 扩展信息
const EXTENSION_INFO = {
  NAME: 'Gmail Label Manager',
  VERSION: '1.0.0'
};