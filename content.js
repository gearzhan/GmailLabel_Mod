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
  panelPosition: { x: 12, y: 16 }  // 面板位置（左边距、底边距）
};

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
      'panelPosition'
    ], (data) => {
      STATE.displayNameMap = data.displayNameMap || {};
      STATE.order = data.order || [];
      STATE.hidden = new Set(data.hidden || []);
      STATE.groups = data.groups || {};
      STATE.labelGroups = data.labelGroups || {};
      STATE.collapsedGroups = new Set(data.collapsedGroups || []);
      // 加载面板收起状态，如果未设置则使用默认值（true）
      STATE.panelCollapsed = data.panelCollapsed !== undefined ? data.panelCollapsed : true;
      // 加载面板位置，如果未设置则使用默认值（左下角）
      STATE.panelPosition = data.panelPosition || { x: 12, y: 16 };
      resolve();
    });
  });
}

// 从后台获取标签列表
async function getLabels() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_LABELS' }, (response) => {
      resolve(response);
    });
  });
}

// 编码标签为搜索语法
// Gmail 规则：转小写，空格、斜杠、& 替换为连字符，其他字符保持不变
function encodeLabel(labelName) {
  // 1. 转小写
  // 2. 空格、斜杠、& 替换为连字符
  // 3. 其他特殊字符（如 [], () 等）保持不变
  const normalized = labelName
    .toLowerCase()
    .replace(/[\s\/&]/g, '-');    // 只替换空格、斜杠和 &

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

    // 按名称排序
    visibleLabels.sort((a, b) => {
      const nameA = getDisplayName(a.name).toLowerCase();
      const nameB = getDisplayName(b.name).toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // 获取分组名称
    let groupName = 'Ungrouped';
    if (groupId === 'system') {
      groupName = 'System';
    } else if (STATE.groups[groupId]) {
      groupName = STATE.groups[groupId].name;
    }

    html += `
      <div class="label-group" data-group-id="${groupId}">
        <div class="group-header" data-group-id="${groupId}">
          <span class="group-toggle">${isCollapsed ? '▶' : '▼'}</span>
          <span class="group-name">${groupName}</span>
          <span class="group-count">(${visibleLabels.length})</span>
        </div>
        <div class="group-labels" style="${isCollapsed ? 'display: none;' : ''}">
    `;

    visibleLabels.forEach(label => {
      const displayName = getDisplayName(label.name);
      const isSelected = STATE.selected.has(label.name);
      html += `
        <div class="label-item ${isSelected ? 'selected' : ''}" data-label="${label.name}">
          ${displayName}
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
  const $modeBtn = shadow.getElementById('modeBtn');

  if ($labelList) {
    renderLabels($labelList);
  }

  if ($modeBtn) {
    $modeBtn.textContent = STATE.mode;
    $modeBtn.className = STATE.mode === 'OR' ? 'btn mode-or' : 'btn';
  }
}

// 注入面板 UI
function injectPanel() {
  // 防止重复注入
  if (document.getElementById('mlp-root')) return;

  // 创建容器
  const host = document.createElement('div');
  host.id = 'mlp-root';
  // 使用STATE中保存的位置
  host.style.cssText = `
    position: fixed;
    bottom: ${STATE.panelPosition.y}px;
    left: ${STATE.panelPosition.x}px;
    width: 300px;
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  `;

  // 使用 Shadow DOM 隔离样式
  const shadow = host.attachShadow({ mode: 'open' });

  // 创建面板内容
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      .card {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
        font-size: 13px;
        line-height: 1.5;
        position: relative;
      }
      .panel-content {
        padding: 12px;
      }
      .controls {
        display: flex;
        gap: 6px;
        margin-bottom: 10px;
        flex-wrap: wrap;
      }
      .filter-input {
        flex: 1;
        min-width: 140px;
        padding: 6px 10px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 12px;
        outline: none;
      }
      .filter-input:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
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
        padding: 1px 5px;
        cursor: pointer;
        user-select: none;
        transition: all 0.15s;
        font-size: 12px;
        background: #f8fafc;
        border: 1px solid #bfdbfe;
        border-radius: 3px;
        white-space: nowrap;
      }
      .label-item:hover {
        background: #dbeafe;
        border-color: #93c5fd;
      }
      .label-item.selected {
        background: #3b82f6;
        color: #ffffff;
        border-color: #3b82f6;
      }
      .label-item.selected:hover {
        background: #2563eb;
        border-color: #2563eb;
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
        position: absolute;
        top: -16px;
        right: 12px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #1a73e8;
        color: white;
        border: none;
        cursor: pointer;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
        box-shadow: 0 2px 4px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.1);
        z-index: 1;
      }
      .collapse-toggle:hover {
        background: #1765cc;
        transform: scale(1.1);
        box-shadow: 0 4px 8px rgba(0,0,0,0.25), 0 6px 12px rgba(0,0,0,0.15);
      }
      .collapse-toggle:active {
        transform: scale(1.05);
      }
      .collapse-icon {
        transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
      }
      .panel-collapsed .collapse-icon {
        transform: rotate(180deg);
      }
      .panel-collapsed {
        width: 44px;
        height: 44px;
        background: transparent;
        border: none;
        box-shadow: none;
        pointer-events: none;  /* 整个面板不捕获点击事件 */
      }
      .panel-collapsed .panel-content {
        display: none;
      }
      .panel-collapsed .collapse-toggle {
        position: relative;
        top: auto;
        right: auto;
        margin: 8px;
        width: 44px;
        height: 44px;
        font-size: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.1);
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
          <button class="btn" id="modeBtn">${STATE.mode}</button>
        </div>
        <div class="label-list" id="labelList">
          <div class="loading">Loading labels...</div>
        </div>
        <div class="action-bar">
          <button class="btn" id="clearBtn">Clear</button>
          <button class="btn primary" id="searchBtn">Search</button>
        </div>
      </div>
      <button class="collapse-toggle" id="collapseBtn" title="${STATE.panelCollapsed ? 'Expand panel' : 'Collapse panel'}">
        <span class="collapse-icon">▼</span>
      </button>
    </div>
  `;

  shadow.appendChild(wrapper);
  document.body.appendChild(host);

  // 绑定事件
  const $filterInput = shadow.getElementById('filterInput');
  const $modeBtn = shadow.getElementById('modeBtn');
  const $clearBtn = shadow.getElementById('clearBtn');
  const $searchBtn = shadow.getElementById('searchBtn');
  const $collapseBtn = shadow.getElementById('collapseBtn');

  $filterInput.addEventListener('input', (e) => {
    STATE.filterText = e.target.value;
    renderPanel();
  });

  $modeBtn.addEventListener('click', () => {
    STATE.mode = STATE.mode === 'AND' ? 'OR' : 'AND';
    renderPanel();
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
    } else {
      $panel.classList.remove('panel-collapsed');
      $collapseBtn.title = 'Collapse panel';
    }
    // 保存面板收起状态
    chrome.storage.sync.set({ panelCollapsed: STATE.panelCollapsed });
  });

  // 拖拽相关变量
  let isDragging = false;
  let dragStartX, dragStartY;
  let originalX, originalY;

  // 鼠标按下事件 - 开始拖拽
  $collapseBtn.addEventListener('mousedown', (e) => {
    // 仅收起状态下可拖拽
    if (!STATE.panelCollapsed) return;

    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    const rect = host.getBoundingClientRect();
    originalX = rect.left;
    originalY = window.innerHeight - rect.bottom;

    e.preventDefault();
  });

  // 鼠标移动事件 - 拖拽中
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartX;
    const deltaY = dragStartY - e.clientY;  // Y轴反向（bottom定位）

    const newX = originalX + deltaX;
    const newY = originalY + deltaY;

    host.style.left = `${newX}px`;
    host.style.bottom = `${newY}px`;
  });

  // 鼠标释放事件 - 结束拖拽
  document.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    isDragging = false;

    // 边缘吸附逻辑
    snapToEdge(host);
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
  }

  // 窗口大小变化时重新吸附
  window.addEventListener('resize', () => {
    if (STATE.panelCollapsed) {
      snapToEdge(host);
    }
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
      $errorContainer.innerHTML = `
        <div class="error">
          Failed to load labels: ${response.error}<br>
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
    $errorContainer.innerHTML = `
      <div class="error">
        Error: ${error.message}
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
