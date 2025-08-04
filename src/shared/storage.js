/**
 * 存储管理模块
 * 提供数据持久化存储和访问接口
 */

/**
 * 存储管理类
 */
class StorageManager {
  constructor() {
    this.cache = new Map();
  }

  /**
   * 获取存储数据
   * @param {string} key - 存储键名
   * @param {any} defaultValue - 默认值
   * @returns {Promise<any>} 存储的数据
   */
  async get(key, defaultValue = null) {
    try {
      // 先检查缓存
      if (this.cache.has(key)) {
        return this.cache.get(key);
      }

      const result = await chrome.storage.local.get([key]);
      const value = result[key] !== undefined ? result[key] : defaultValue;
      
      // 更新缓存
      this.cache.set(key, value);
      
      debugLog(`Storage get: ${key}`, value);
      return value;
    } catch (error) {
      errorLog(`Failed to get storage key: ${key}`, error);
      return defaultValue;
    }
  }

  /**
   * 设置存储数据
   * @param {string} key - 存储键名
   * @param {any} value - 要存储的值
   * @returns {Promise<boolean>} 是否成功
   */
  async set(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
      
      // 更新缓存
      this.cache.set(key, value);
      
      debugLog(`Storage set: ${key}`, value);
      return true;
    } catch (error) {
      errorLog(`Failed to set storage key: ${key}`, error);
      return false;
    }
  }

  /**
   * 删除存储数据
   * @param {string} key - 存储键名
   * @returns {Promise<boolean>} 是否成功
   */
  async remove(key) {
    try {
      await chrome.storage.local.remove([key]);
      
      // 清除缓存
      this.cache.delete(key);
      
      debugLog(`Storage remove: ${key}`);
      return true;
    } catch (error) {
      errorLog(`Failed to remove storage key: ${key}`, error);
      return false;
    }
  }

  /**
   * 清空所有存储数据
   * @returns {Promise<boolean>} 是否成功
   */
  async clear() {
    try {
      await chrome.storage.local.clear();
      
      // 清空缓存
      this.cache.clear();
      
      debugLog('Storage cleared');
      return true;
    } catch (error) {
      errorLog('Failed to clear storage', error);
      return false;
    }
  }

  /**
   * 获取用户设置
   * @returns {Promise<Object>} 用户设置对象
   */
  async getUserSettings() {
    const settings = await this.get(STORAGE_KEYS.USER_SETTINGS, DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...settings };
  }

  /**
   * 更新用户设置
   * @param {Object} newSettings - 新的设置
   * @returns {Promise<boolean>} 是否成功
   */
  async updateUserSettings(newSettings) {
    const currentSettings = await this.getUserSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    return await this.set(STORAGE_KEYS.USER_SETTINGS, updatedSettings);
  }

  /**
   * 获取自定义标签映射
   * @returns {Promise<Object>} 标签映射对象
   */
  async getCustomLabels() {
    return await this.get(STORAGE_KEYS.CUSTOM_LABELS, {});
  }

  /**
   * 设置自定义标签名称
   * @param {string} labelId - 标签ID
   * @param {string} customName - 自定义名称
   * @returns {Promise<boolean>} 是否成功
   */
  async setCustomLabel(labelId, customName) {
    const customLabels = await this.getCustomLabels();
    customLabels[labelId] = customName;
    return await this.set(STORAGE_KEYS.CUSTOM_LABELS, customLabels);
  }

  /**
   * 获取标签顺序
   * @returns {Promise<Array>} 标签顺序数组
   */
  async getLabelOrder() {
    return await this.get(STORAGE_KEYS.LABEL_ORDER, []);
  }

  /**
   * 设置标签顺序
   * @param {Array} order - 标签顺序数组
   * @returns {Promise<boolean>} 是否成功
   */
  async setLabelOrder(order) {
    return await this.set(STORAGE_KEYS.LABEL_ORDER, order);
  }

  /**
   * 获取标签缓存
   * @returns {Promise<Object>} 标签缓存对象
   */
  async getLabelCache() {
    return await this.get(STORAGE_KEYS.LABEL_CACHE, {});
  }

  /**
   * 更新标签缓存
   * @param {Object} cacheData - 缓存数据
   * @returns {Promise<boolean>} 是否成功
   */
  async updateLabelCache(cacheData) {
    const currentCache = await this.getLabelCache();
    const updatedCache = { ...currentCache, ...cacheData };
    return await this.set(STORAGE_KEYS.LABEL_CACHE, updatedCache);
  }
}

// 创建存储管理实例
const storage = new StorageManager();