// Content Script - Inject multi-label picker panel in Gmail

// 应用状态
const STATE = {
  allLabels: [],      // 所有标签列表
  selected: new Set(), // 已选中的标签（真实名称）
  mode: 'AND',        // 搜索模式：AND 或 OR
  filterText: '',     // 过滤文本
  groups: {},         // 自定义分组 { groupId: { name, labelIds: [], collapsed: false } }
  labelGroups: {},    // 标签到分组的映射 { labelId: groupId }
  collapsedGroups: new Set(), // 收起的分组 ID
  panelCollapsed: true, // 面板是否收起（默认收起）
  panelPosition: { x: 12, y: 16 },  // 面板位置（左边距、底边距）
  labelColorMap: {}   // 标签颜色映射 { labelId: { backgroundColor, textColor } }
};

// 安全转义文本，防止注入
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 从存储加载配置
async function loadConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([
      'displayNameMap',
      'order',
      'hidden',
      'groups',
      'labelGroups',
      'collapsedGroups',
      'panelCollapsed',
      'panelPosition',
      'labelColorMap'
    ], (data) => {
      STATE.displayNameMap = data.displayNameMap || {};

      // 数据迁移：将旧的数组格式转换为对象格式
      if (Array.isArray(data.order)) {
        console.warn('[Panel Order] Migrating old array format to object format');
        STATE.order = {};  // 重置为空对象
      } else {
        STATE.order = data.order || {};  // 加载为对象
      }

      STATE.hidden = new Set(data.hidden || []);
      STATE.groups = data.groups || {};
      STATE.labelGroups = data.labelGroups || {};
      STATE.collapsedGroups = new Set(data.collapsedGroups || []);
      // 加载面板收起状态，如果未设置则使用默认值（true）
      STATE.panelCollapsed = data.panelCollapsed !== undefined ? data.panelCollapsed : true;
      // 加载面板位置，如果未设置则使用默认值（左下角）
      STATE.panelPosition = data.panelPosition || { x: 12, y: 16 };
      // 加载标签颜色映射
      STATE.labelColorMap = data.labelColorMap || {};
      resolve();
    });
  });
}

// 从后台获取标签列表
async function getLabels() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_LABELS', accountKey: getAccountKey() }, (response) => {
      resolve(response);
    });
  });
}

// 编码标签为搜索语法
// Gmail UI 习惯：小写并将空格、斜杠、& 转为短横线
function encodeLabel(labelName) {
  const normalized = labelName
    .toLowerCase()
    .replace(/[\s/&]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `label:${normalized}`;
}

// 构建搜索查询
function buildQuery() {
  const labels = Array.from(STATE.selected);
  if (labels.length === 0) return '';

  if (STATE.mode === 'AND') {
    return labels.map(encodeLabel).join(' ');
  } else {
    return labels.map(encodeLabel).join(' OR ');
  }
}

// 获取当前账号索引
function getAccountIndex() {
  const match = location.href.match(/\/u\/(\d+)\//);
  return match ? match[1] : '0';
}

// 构建账号键，用于隔离 token
function getAccountKey() {
  return `u${getAccountIndex()}`;
}

// 导航到搜索结果
function navigateSearch(query) {
  if (!query) {
    alert('Please select at least one label');
    return;
  }
  const accountIndex = getAccountIndex();
  const url = `https://mail.google.com/mail/u/${accountIndex}/#search/${encodeURIComponent(query)}`;
  location.assign(url);
}

// 获取标签显示名称
function getDisplayName(labelName) {
  return STATE.displayNameMap[labelName] || labelName;
}

// 检查标签是否隐藏
function isHidden(labelName) {
  return STATE.hidden.has(labelName);
}

// 获取分组内的标签
function getGroupLabels(groupId) {
  return STATE.allLabels.filter(label => {
    const labelGroupId = STATE.labelGroups[label.id] ||
                        (label.type === 'system' ? 'system' : 'ungrouped');
    return labelGroupId === groupId;
  });
}

// 检查分组是否应该显示
function shouldShowGroup(groupId) {
  const labels = getGroupLabels(groupId);
  // 如果分组为空，不显示
  if (labels.length === 0) return false;

  // 如果所有标签都隐藏，不显示
  const visibleLabels = labels.filter(label => !isHidden(label.name));
  return visibleLabels.length > 0;
}

// 获取标签颜色样式
function getLabelColor(labelId) {
  const colors = STATE.labelColorMap[labelId];
  if (colors && colors.backgroundColor) {
    return {
      backgroundColor: colors.backgroundColor,
      textColor: colors.textColor || '#ffffff'
    };
  }

  // 默认灰色方案
  return {
    backgroundColor: '#9ca3af',
    textColor: '#ffffff'
  };
}

// 辅助函数 - 根据排序获取标签
function getSortedLabelsForGroup(labels, groupId) {
  if (!STATE.order || !STATE.order[groupId] || STATE.order[groupId].length === 0) {
    console.log(`[Panel Order] No saved order for ${groupId}, using alphabetical`);
    // 无排序数据，按字母顺序
    return labels.sort((a, b) => {
      const nameA = getDisplayName(a.name).toLowerCase();
      const nameB = getDisplayName(b.name).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }

  console.log(`[Panel Order] Applying saved order for ${groupId}:`, STATE.order[groupId]);

  const orderMap = {};
  STATE.order[groupId].forEach((labelId, index) => {
    orderMap[labelId] = index;
  });

  return labels.sort((a, b) => {
    const orderA = orderMap[a.id] !== undefined ? orderMap[a.id] : 999999;
    const orderB = orderMap[b.id] !== undefined ? orderMap[b.id] : 999999;
    if (orderA !== orderB) return orderA - orderB;

    const nameA = getDisplayName(a.name).toLowerCase();
    const nameB = getDisplayName(b.name).toLowerCase();
    return nameA.localeCompare(nameB);
  });
}

// 渲染标签列表
function renderLabels(container) {
  const filterText = STATE.filterText.toLowerCase();

  // 获取所有分组
  const allGroupIds = new Set([
    'system',
    'ungrouped',
    ...Object.keys(STATE.groups)
  ]);

  let html = '';

  for (const groupId of allGroupIds) {
    if (!shouldShowGroup(groupId)) continue;

    const isCollapsed = STATE.collapsedGroups.has(groupId);
    const groupLabels = getGroupLabels(groupId);

    // 过滤标签
    const visibleLabels = groupLabels.filter(label => {
      if (isHidden(label.name)) return false;
      if (!filterText) return true;

      const displayName = getDisplayName(label.name).toLowerCase();
      const realName = label.name.toLowerCase();
      return displayName.includes(filterText) || realName.includes(filterText);
    });

    if (visibleLabels.length === 0) continue;

    // 应用排序（如果有排序数据）
    const sortedLabels = getSortedLabelsForGroup(visibleLabels, groupId);

    // 获取分组名称
    let groupName = 'Ungrouped';
    if (groupId === 'system') {
      groupName = 'System';
    } else if (STATE.groups[groupId]) {
      groupName = STATE.groups[groupId].name;
    }
    const safeGroupName = escapeHtml(groupName);

    html += `
      <div class="label-group" data-group-id="${groupId}">
        <div class="group-header" data-group-id="${groupId}">
          <span class="group-toggle">${isCollapsed ? '▶' : '▼'}</span>
          <span class="group-name">${safeGroupName}</span>
          <span class="group-count">(${sortedLabels.length})</span>
        </div>
        <div class="group-labels" style="${isCollapsed ? 'display: none;' : ''}">
    `;

    sortedLabels.forEach(label => {
      const displayName = getDisplayName(label.name);
      const isSelected = STATE.selected.has(label.name);
      const colors = getLabelColor(label.id);
      const safeDisplayName = escapeHtml(displayName);
      const safeLabelName = escapeHtml(label.name);

      // 使用MD3基础样式，label颜色作为左边框装饰
      const style = isSelected
        ? `border-left: 3px solid ${colors.backgroundColor};`
        : `border-left: 3px solid ${colors.backgroundColor}; opacity: 0.7;`;

      html += `
        <div class="label-item ${isSelected ? 'selected' : ''}"
             data-label="${safeLabelName}"
             style="${style}">
          ${safeDisplayName}
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  }

  if (html === '') {
    container.innerHTML = '<div class="empty-state">No labels found</div>';
  } else {
    container.innerHTML = html;
  }

  // 绑定事件
  container.querySelectorAll('.label-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const labelName = item.dataset.label;
      if (STATE.selected.has(labelName)) {
        STATE.selected.delete(labelName);
      } else {
        STATE.selected.add(labelName);
      }
      renderPanel();
    });
  });

  container.querySelectorAll('.group-header').forEach(header => {
    header.addEventListener('click', () => {
      const groupId = header.dataset.groupId;
      if (STATE.collapsedGroups.has(groupId)) {
        STATE.collapsedGroups.delete(groupId);
      } else {
        STATE.collapsedGroups.add(groupId);
      }
      // 保存状态
      chrome.storage.sync.set({
        collapsedGroups: Array.from(STATE.collapsedGroups)
      });
      renderPanel();
    });
  });
}

// 渲染面板
function renderPanel() {
  const shadow = document.getElementById('mlp-root')?.shadowRoot;
  if (!shadow) return;

  const $labelList = shadow.getElementById('labelList');
  const $chipsContainer = shadow.getElementById('chipsContainer');
  const $modeBtn = shadow.getElementById('modeBtn');

  // 渲染chips（选中的标签）
  if ($chipsContainer) {
    $chipsContainer.innerHTML = '';

    if (STATE.selected.size > 0) {
      STATE.selected.forEach(labelName => {
        const displayName = getDisplayName(labelName);
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.innerHTML = `
          <span>${escapeHtml(displayName)}</span>
          <span class="chip-remove" data-label="${escapeHtml(labelName)}">×</span>
        `;

        // 绑定移除事件
        chip.querySelector('.chip-remove').addEventListener('click', (e) => {
          e.stopPropagation();
          STATE.selected.delete(labelName);
          renderPanel();
        });

        $chipsContainer.appendChild(chip);
      });
      $chipsContainer.style.display = 'flex';
    } else {
      $chipsContainer.style.display = 'none';
    }
  }

  // 渲染标签列表
  if ($labelList) {
    renderLabels($labelList);
  }
}

// 注入面板 UI
function injectPanel() {
  // 防止重复注入
  if (document.getElementById('mlp-root')) return;

  // 创建容器
  const host = document.createElement('div');
  host.id = 'mlp-root';
  // 使用STATE中保存的位置，宽度根据收起状态动态设置
  host.style.cssText = `
    position: fixed;
    bottom: ${STATE.panelPosition.y}px;
    left: ${STATE.panelPosition.x}px;
    width: ${STATE.panelCollapsed ? '56px' : '320px'};
    z-index: 9999;
    font-family: 'Google Sans', 'Roboto', Arial, sans-serif;
  `;

  // 使用 Shadow DOM 隔离样式
  const shadow = host.attachShadow({ mode: 'open' });

  // 创建面板内容
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <style>
      /* Material Design 3 Design Tokens - Gmail themed */
      :host {
        /* Primary Colors */
        --md-sys-color-primary: #0b57d0;
        --md-sys-color-on-primary: #ffffff;
        --md-sys-color-primary-container: #d3e3fd;
        --md-sys-color-on-primary-container: #041e49;

        /* Secondary Colors */
        --md-sys-color-secondary: #5a5d72;
        --md-sys-color-on-secondary: #ffffff;
        --md-sys-color-secondary-container: #e8def8;
        --md-sys-color-on-secondary-container: #1d192b;

        /* Surface Colors */
        --md-sys-color-surface: #fdfcff;
        --md-sys-color-surface-dim: #dfe2eb;
        --md-sys-color-surface-bright: #fdfcff;
        --md-sys-color-surface-container-lowest: #ffffff;
        --md-sys-color-surface-container-low: #f7f9ff;
        --md-sys-color-surface-container: #f0f4f9;
        --md-sys-color-surface-container-high: #e8ebed;
        --md-sys-color-surface-container-highest: #e3e5e8;
        --md-sys-color-on-surface: #1a1c1e;
        --md-sys-color-on-surface-variant: #44474e;

        /* Outline */
        --md-sys-color-outline: #747775;
        --md-sys-color-outline-variant: #c4c6c4;

        /* Error Colors */
        --md-sys-color-error: #ba1a1a;
        --md-sys-color-on-error: #ffffff;
        --md-sys-color-error-container: #ffdad6;
        --md-sys-color-on-error-container: #410002;

        /* Elevation Shadows - MD3 Standard */
        --md-elevation-1:
          0px 1px 2px 0px rgba(0, 0, 0, 0.3),
          0px 1px 3px 1px rgba(0, 0, 0, 0.15);
        --md-elevation-2:
          0px 1px 2px 0px rgba(0, 0, 0, 0.3),
          0px 2px 6px 2px rgba(0, 0, 0, 0.15);
        --md-elevation-3:
          0px 4px 8px 3px rgba(0, 0, 0, 0.15),
          0px 1px 3px rgba(0, 0, 0, 0.3);

        /* Shape Tokens */
        --md-sys-shape-corner-none: 0px;
        --md-sys-shape-corner-extra-small: 4px;
        --md-sys-shape-corner-small: 8px;
        --md-sys-shape-corner-medium: 12px;
        --md-sys-shape-corner-large: 16px;
        --md-sys-shape-corner-extra-large: 28px;
        --md-sys-shape-corner-full: 9999px;
      }

      * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Google Sans', 'Roboto', Arial, sans-serif; }
      .card {
        background: var(--md-sys-color-surface);
        border: none;
        border-radius: var(--md-sys-shape-corner-medium);
        box-shadow: var(--md-elevation-3);
        width: 320px;
        font-size: 13px;
        line-height: 1.5;
        position: relative;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        margin-bottom: 70px;
        transition: opacity 0.2s ease, transform 0.2s ease;
      }
      .panel-content {
        padding: 12px;
      }
      /* Chips Container - MD3 Input Chips */
      .chips-container {
        padding: 0 12px 12px 12px;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        max-height: 120px;
        overflow-y: auto;
        border-bottom: 1px solid var(--md-sys-color-outline-variant);
        margin-bottom: 8px;
      }
      .chip {
        background: var(--md-sys-color-secondary-container);
        color: var(--md-sys-color-on-secondary-container);
        border-radius: var(--md-sys-shape-corner-small);
        padding: 6px 4px 6px 12px;
        font-size: 14px;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        animation: chipFadeIn 0.2s ease;
        user-select: none;
      }
      .chip-remove {
        cursor: pointer;
        font-size: 18px;
        font-weight: 400;
        opacity: 0.6;
        padding: 0 6px;
        margin: -2px -2px -2px 2px;
        border-radius: var(--md-sys-shape-corner-extra-small);
        transition: all 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .chip-remove:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.1);
      }
      @keyframes chipFadeIn {
        from { opacity: 0; transform: scale(0.8); }
        to { opacity: 1; transform: scale(1); }
      }
      .controls {
        display: flex;
        gap: 8px;
        margin-bottom: 10px;
        flex-wrap: wrap;
      }
      .filter-input {
        flex: 1;
        min-width: 140px;
        padding: 8px 12px;
        border: 1px solid var(--md-sys-color-outline-variant);
        border-radius: 24px;
        font-size: 13px;
        outline: none;
        background: var(--md-sys-color-surface-container);
        color: var(--md-sys-color-on-surface);
      }
      .filter-input:focus {
        border-color: var(--md-sys-color-primary);
        background: var(--md-sys-color-surface);
      }
      /* Segmented Button Control - MD3 */
      .mode-switch {
        display: flex;
        background: var(--md-sys-color-surface-container-high);
        border-radius: 20px;
        padding: 3px;
        gap: 2px;
      }
      .mode-option {
        padding: 6px 16px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        border: none;
        background: transparent;
        color: var(--md-sys-color-on-surface-variant);
        transition: all 0.2s;
        white-space: nowrap;
      }
      .mode-option.active {
        background: var(--md-sys-color-secondary-container);
        color: var(--md-sys-color-on-secondary-container);
        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      }
      .mode-option:hover:not(.active) {
        background: rgba(0, 0, 0, 0.05);
      }
      .btn {
        padding: 6px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        background: #f9fafb;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.15s;
        white-space: nowrap;
      }
      .btn:hover {
        background: #f3f4f6;
        border-color: #9ca3af;
      }
      .btn.primary {
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
      }
      .btn.primary:hover {
        background: #2563eb;
      }
      .btn.mode-or {
        background: #f59e0b;
        color: white;
        border-color: #f59e0b;
      }
      .btn.mode-or:hover {
        background: #d97706;
      }
      .label-list {
        max-height: 400px;
        overflow-y: auto;
        border-top: 1px solid #e5e7eb;
        padding-top: 10px;
      }
      .label-list::-webkit-scrollbar {
        width: 5px;
      }
      .label-list::-webkit-scrollbar-track {
        background: #f3f4f6;
        border-radius: 3px;
      }
      .label-list::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 3px;
      }
      .label-group {
        margin-bottom: 12px;
      }
      .group-header {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 8px;
        background: #f9fafb;
        border-radius: 4px;
        cursor: pointer;
        user-select: none;
        margin-bottom: 6px;
        font-weight: 500;
        font-size: 12px;
        color: #374151;
      }
      .group-header:hover {
        background: #f3f4f6;
      }
      .group-toggle {
        font-size: 10px;
        color: #6b7280;
      }
      .group-name {
        flex: 1;
      }
      .group-count {
        font-size: 11px;
        color: #9ca3af;
        font-weight: normal;
      }
      .group-labels {
        display: flex;
        flex-wrap: wrap;
        gap: 3px;
        padding-left: 12px;
      }
      .label-item {
        padding: 6px 16px;
        margin: 3px 0;
        cursor: pointer;
        user-select: none;
        transition: all 0.15s;
        font-size: 13px;
        font-weight: 400;
        border-radius: 20px;
        white-space: nowrap;
        border: 1px solid transparent;
        color: var(--md-sys-color-on-surface);
        background: var(--md-sys-color-surface-container);
      }
      .label-item:hover {
        background: var(--md-sys-color-surface-container-high);
      }
      .label-item.selected {
        background: var(--md-sys-color-primary-container);
        color: var(--md-sys-color-on-primary-container);
        border-color: var(--md-sys-color-outline);
        font-weight: 500;
      }
      .label-item.selected:hover {
        filter: brightness(0.95);
      }
      .action-bar {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 6px;
      }
      .empty-state {
        text-align: center;
        padding: 24px 12px;
        color: #9ca3af;
        font-size: 12px;
      }
      .loading {
        text-align: center;
        padding: 24px 12px;
        color: #6b7280;
        font-size: 12px;
      }
      .error {
        padding: 10px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 6px;
        color: #991b1b;
        font-size: 12px;
        margin-bottom: 10px;
      }
      .collapse-toggle {
        position: fixed;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: var(--md-sys-color-primary-container);
        color: var(--md-sys-color-on-primary-container);
        border: none;
        cursor: pointer;
        font-size: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s cubic-bezier(0.2, 0.0, 0, 1.0);
        box-shadow: var(--md-elevation-3);
        z-index: 10;
        padding: 0;
      }
      .collapse-toggle:hover {
        background: var(--md-sys-color-primary-container);
        transform: scale(1.05);
        box-shadow: var(--md-elevation-3);
        filter: brightness(0.95);
      }
      .collapse-toggle:active {
        transform: scale(1.0);
      }
      .panel-collapsed {
        width: 56px;
        height: 56px;
        background: transparent;
        border: none;
        box-shadow: none;
        pointer-events: none;  /* 整个面板不捕获点击事件 */
      }
      .panel-collapsed .panel-content {
        display: none;
      }
      .panel-collapsed .collapse-toggle {
        pointer-events: auto;  /* 仅按钮可点击 */
      }
      .card {
        transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
      }
    </style>
    <div class="card ${STATE.panelCollapsed ? 'panel-collapsed' : ''}" id="panel">
      <div class="panel-content">
        <div id="errorContainer"></div>
        <div class="controls">
          <input
            type="search"
            class="filter-input"
            id="filterInput"
            placeholder="🔍 Filter labels..."
          />
          <div class="mode-switch" id="modeSwitch">
            <button class="mode-option ${STATE.mode === 'AND' ? 'active' : ''}" data-val="AND">ALL</button>
            <button class="mode-option ${STATE.mode === 'OR' ? 'active' : ''}" data-val="OR">ANY</button>
          </div>
        </div>
        <div class="chips-container" id="chipsContainer" style="display: none;"></div>
        <div class="label-list" id="labelList">
          <div class="loading">Loading labels...</div>
        </div>
        <div class="action-bar">
          <button class="btn" id="clearBtn">Clear</button>
          <button class="btn primary" id="searchBtn">Search</button>
        </div>
      </div>
      <button class="collapse-toggle" id="collapseBtn" title="${STATE.panelCollapsed ? 'Expand panel' : 'Collapse panel'}">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
        </svg>
      </button>
    </div>
  `;

  shadow.appendChild(wrapper);
  document.body.appendChild(host);

  // 绑定事件
  const $filterInput = shadow.getElementById('filterInput');
  const $modeSwitch = shadow.getElementById('modeSwitch');
  const $clearBtn = shadow.getElementById('clearBtn');
  const $searchBtn = shadow.getElementById('searchBtn');
  const $collapseBtn = shadow.getElementById('collapseBtn');

  $filterInput.addEventListener('input', (e) => {
    STATE.filterText = e.target.value;
    renderPanel();
  });

  // 绑定分段按钮事件
  $modeSwitch.querySelectorAll('.mode-option').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.mode = btn.dataset.val;
      // 更新active状态
      $modeSwitch.querySelectorAll('.mode-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  $clearBtn.addEventListener('click', () => {
    STATE.selected.clear();
    renderPanel();
  });

  $searchBtn.addEventListener('click', () => {
    const query = buildQuery();
    navigateSearch(query);
  });

  $collapseBtn.addEventListener('click', () => {
    STATE.panelCollapsed = !STATE.panelCollapsed;
    const $panel = shadow.getElementById('panel');

    if (STATE.panelCollapsed) {
      $panel.classList.add('panel-collapsed');
      $collapseBtn.title = 'Expand panel';
      host.style.width = '56px';  // 收起时缩小host宽度
    } else {
      $panel.classList.remove('panel-collapsed');
      $collapseBtn.title = 'Collapse panel';
      host.style.width = '320px';  // 展开时恢复host宽度
    }
    // 保存面板收起状态
    chrome.storage.sync.set({ panelCollapsed: STATE.panelCollapsed });
    updateTogglePosition();  // 确保位置正确
  });

  // 更新 toggle 按钮的固定位置
  function updateTogglePosition() {
    const shadow = document.getElementById('mlp-root')?.shadowRoot;
    if (!shadow) return;

    const $collapseBtn = shadow.getElementById('collapseBtn');
    if (!$collapseBtn) return;

    // 固定在屏幕的 panelPosition 位置（左下角）
    $collapseBtn.style.left = `${STATE.panelPosition.x}px`;
    $collapseBtn.style.bottom = `${STATE.panelPosition.y}px`;
  }

  // 初始设置 toggle 位置
  updateTogglePosition();

  // 拖拽相关变量
  let isDragging = false;
  let isRealDrag = false;  // 标记是否为真正的拖拽
  let dragStartX, dragStartY;
  let originalX, originalY;
  let dragStartTime = 0;  // 拖拽开始时间

  // 鼠标按下事件 - 开始拖拽
  $collapseBtn.addEventListener('mousedown', (e) => {
    // 仅收起状态下可拖拽
    if (!STATE.panelCollapsed) return;

    isDragging = true;
    isRealDrag = false;  // 初始假设不是拖拽
    dragStartTime = Date.now();  // 记录开始时间
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    const rect = host.getBoundingClientRect();
    originalX = rect.left;
    originalY = window.innerHeight - rect.bottom;

    e.preventDefault();
    e.stopPropagation();  // 阻止事件冒泡
  });

  // 鼠标移动事件 - 拖拽中
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartX;
    const deltaY = dragStartY - e.clientY;  // Y轴反向（bottom定位）
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const elapsed = Date.now() - dragStartTime;

    // 判断是否为真正的拖拽（时间超过300ms 或 移动超过5px）
    if (!isRealDrag && (elapsed > 300 || distance > 5)) {
      isRealDrag = true;
    }

    if (isRealDrag) {
      const newX = originalX + deltaX;
      const newY = originalY + deltaY;

      host.style.left = `${newX}px`;
      host.style.bottom = `${newY}px`;
    }
  });

  // 鼠标释放事件 - 结束拖拽
  document.addEventListener('mouseup', (e) => {
    if (!isDragging) return;

    if (isRealDrag) {
      // 是拖拽操作：执行吸附，不触发展开
      snapToEdge(host);
      e.preventDefault();
      e.stopPropagation();  // 阻止触发click事件
    }
    // 如果不是拖拽（isRealDrag=false），则允许click事件触发展开

    isDragging = false;
    isRealDrag = false;
  });

  // 边缘吸附函数
  function snapToEdge(host) {
    const rect = host.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const centerX = rect.left + rect.width / 2;
    const currentY = windowHeight - rect.bottom;

    let finalX;
    if (centerX < windowWidth / 2) {
      // 吸附到左边
      finalX = 12;
    } else {
      // 吸附到右边
      finalX = windowWidth - rect.width - 12;
    }

    // Y轴限制在安全范围内
    const finalY = Math.max(16, Math.min(currentY, windowHeight - rect.height - 16));

    // 动画过渡
    host.style.transition = 'left 0.3s ease, bottom 0.3s ease';
    host.style.left = `${finalX}px`;
    host.style.bottom = `${finalY}px`;

    setTimeout(() => {
      host.style.transition = '';
    }, 300);

    // 保存位置
    STATE.panelPosition = { x: finalX, y: finalY };
    chrome.storage.sync.set({ panelPosition: STATE.panelPosition });
    updateTogglePosition();  // 更新 toggle 位置
  }

  // 窗口大小变化时重新吸附
  window.addEventListener('resize', () => {
    if (STATE.panelCollapsed) {
      snapToEdge(host);
    }
    updateTogglePosition();  // 更新 toggle 位置
  });

  // 加载数据
  initPanel();
}

// 初始化面板数据
async function initPanel() {
  const shadow = document.getElementById('mlp-root')?.shadowRoot;
  if (!shadow) return;

  const $errorContainer = shadow.getElementById('errorContainer');
  const $labelList = shadow.getElementById('labelList');

  try {
    // 加载配置
    await loadConfig();

    // 获取标签
    const response = await getLabels();

    if (!response.ok) {
      const safeError = escapeHtml(response.error || 'Unknown error');
      $errorContainer.innerHTML = `
        <div class="error">
          Failed to load labels: ${safeError}<br>
          Please check authorization in settings.
        </div>
      `;
      $labelList.innerHTML = '<div class="empty-state">Authorization required</div>';
      return;
    }

    STATE.allLabels = response.labels || [];

    // 初始化 System 分组
    if (!STATE.groups['system']) {
      STATE.groups['system'] = { name: 'System', labelIds: [] };
    }

    // 渲染标签
    renderPanel();
  } catch (error) {
    console.error('Init panel error:', error);
    const safeError = escapeHtml(error.message || 'Unknown error');
    $errorContainer.innerHTML = `
      <div class="error">
        Error: ${safeError}
      </div>
    `;
  }
}

// 等待 Gmail 加载完成
function waitForGmailReady() {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      // 检查 Gmail 主区域是否已加载
      const mainArea = document.querySelector('div[role="main"]') ||
                      document.querySelector('[data-app="Gmail"]');

      if (mainArea) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 800);

    // 30秒超时
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, 30000);
  });
}

// 主入口
(async function main() {
  // 检查是否在 Gmail 页面
  if (!location.hostname.includes('mail.google.com')) return;

  console.log('[Multi-Label Picker] Waiting for Gmail to load...');

  // 等待 Gmail 加载
  await waitForGmailReady();

  console.log('[Multi-Label Picker] Gmail loaded, injecting panel...');

  // 注入面板
  injectPanel();

  console.log('[Multi-Label Picker] Panel injected successfully');
})();
