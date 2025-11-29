// Options Page Script - Label management and configuration

let allLabels = [];
let displayNameMap = {};
let order = {};  // 修改：从数组改为对象 { groupId: [labelId1, labelId2, ...] }
let hidden = new Set();
let searchText = '';
let groups = {}; // { groupId: { name: string } }
let labelGroups = {}; // { labelId: groupId }
let selectedLabels = new Set(); // 多选标签的ID集合
let collapsedGroups = new Set(); // 收起的分组ID集合

// 加载 Client ID
async function loadClientId() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['clientId'], (data) => {
      const clientId = data.clientId || '';
      document.getElementById('clientIdInput').value = clientId;
      resolve(clientId);
    });
  });
}

// 保存 Client ID
async function saveClientId() {
  const clientId = document.getElementById('clientIdInput').value.trim();

  if (!clientId) {
    showMessage('Please enter a valid Client ID', 'error');
    return;
  }

  if (!clientId.includes('.apps.googleusercontent.com')) {
    showMessage('Invalid Client ID format. Should be: xxx.apps.googleusercontent.com', 'error');
    return;
  }

  return new Promise((resolve) => {
    chrome.storage.sync.set({ clientId }, () => {
      showMessage('Client ID saved. You can now authorize.', 'success');
      resolve();
    });
  });
}

// 从后台获取标签
async function fetchLabels() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_LABELS' }, resolve);
  });
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
      'collapsedGroups'
    ], (data) => {
      displayNameMap = data.displayNameMap || {};

      // 数据迁移：将旧的数组格式转换为对象格式
      if (Array.isArray(data.order)) {
        console.warn('[Order] Migrating old array format to object format');
        order = {};  // 重置为空对象
        // 立即保存以清除旧数据
        chrome.storage.sync.set({ order: {} });
      } else {
        order = data.order || {};  // 加载为对象
      }

      hidden = new Set(data.hidden || []);
      groups = data.groups || {};
      labelGroups = data.labelGroups || {};
      collapsedGroups = new Set(data.collapsedGroups || []);
      resolve();
    });
  });
}

// 保存配置
async function saveConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.set(
      {
        displayNameMap,
        order,
        hidden: Array.from(hidden),
        groups,
        labelGroups,
        collapsedGroups: Array.from(collapsedGroups)
      },
      resolve
    );
  });
}

// 显示消息
function showMessage(text, type = 'success') {
  const $message = document.getElementById('message');
  $message.innerHTML = `<div class="message ${type}">${text}</div>`;
  setTimeout(() => {
    $message.innerHTML = '';
  }, 3000);
}

// 导出配置
async function exportConfiguration() {
  await loadConfig();  // 确保数据最新

  const exportData = {
    version: "1.0",
    exportDate: new Date().toISOString(),
    data: {
      displayNameMap,
      groups,
      labelGroups,
      hidden: Array.from(hidden),
      collapsedGroups: Array.from(collapsedGroups),
      order  // 新增：导出排序数据
    }
  };

  // 生成文件名：GLabel_Config_YYYY-MM-DD.json
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `GLabel_Config_${dateStr}.json`;

  // 创建下载
  const blob = new Blob([JSON.stringify(exportData, null, 2)],
                        { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  showMessage('Configuration exported successfully!', 'success');
}

// 导入配置
async function importConfiguration(file) {
  try {
    const text = await file.text();
    const importData = JSON.parse(text);

    // 验证数据格式
    if (!importData.version || !importData.data) {
      throw new Error('Invalid configuration file format');
    }

    // 数据一致性检查
    const data = importData.data;

    // 验证所有labelGroups引用的groupId都存在
    if (data.labelGroups && data.groups) {
      for (const [labelId, groupId] of Object.entries(data.labelGroups)) {
        if (groupId !== 'system' && groupId !== 'ungrouped' &&
            !data.groups[groupId]) {
          console.warn(`Invalid group reference: ${groupId} for label ${labelId}`);
          delete data.labelGroups[labelId];
        }
      }
    }

    // 导入数据
    displayNameMap = data.displayNameMap || {};
    groups = data.groups || {};
    labelGroups = data.labelGroups || {};
    hidden = new Set(data.hidden || []);
    collapsedGroups = new Set(data.collapsedGroups || []);
    order = data.order || {};  // 新增：导入排序数据

    // 保存到storage
    await saveConfig();

    // 重新渲染
    await loadLabels();

    showMessage(
      `Configuration imported successfully from ${importData.exportDate}`,
      'success'
    );
  } catch (error) {
    showMessage(`Import failed: ${error.message}`, 'error');
  }
}

// 更新认证状态
async function updateAuthStatus() {
  const $authStatus = document.getElementById('authStatus');

  chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' }, (response) => {
    if (response.authenticated) {
      $authStatus.className = 'auth-status authenticated';
      $authStatus.innerHTML = `
        <span>✓ Authorized to access Gmail labels</span>
        <button class="btn" id="revokeBtn">Revoke</button>
      `;

      document.getElementById('revokeBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to revoke authorization?')) {
          chrome.runtime.sendMessage({ type: 'REVOKE_AUTH' }, () => {
            showMessage('Authorization revoked', 'success');
            updateAuthStatus();
          });
        }
      });
    } else {
      $authStatus.className = 'auth-status not-authenticated';
      $authStatus.innerHTML = `
        <span>✗ Not authorized. Click "Refresh Labels" to authorize</span>
        <button class="btn primary" id="authBtn">Authorize Now</button>
      `;

      document.getElementById('authBtn').addEventListener('click', () => {
        loadLabels();
      });
    }
  });
}

// 更新统计信息
function updateStats() {
  const total = allLabels.length;
  const renamed = Object.keys(displayNameMap).length;
  const hiddenCount = hidden.size;

  document.getElementById('totalLabels').textContent = total;
  document.getElementById('renamedLabels').textContent = renamed;
  document.getElementById('hiddenLabels').textContent = hiddenCount;
  document.getElementById('stats').style.display = 'flex';
}

// 渲染分组列表
function renderGroups() {
  const $container = document.getElementById('groupListContainer');

  let html = '';

  // 新建分组表单
  html += `
    <div class="group-card new-group-form">
      <span style="font-weight: 500;">➕</span>
      <input
        type="text"
        id="newGroupInput"
        placeholder="Enter new group name..."
        style="flex: 1;"
      />
      <button class="btn primary" id="createGroupBtn">Create</button>
    </div>
  `;

  // 显示 System 组（不可删除）
  html += `
    <div class="group-card">
      <span style="color: #6b7280; font-weight: 500; font-size: 13px;">📁 System (built-in)</span>
    </div>
  `;

  // 显示自定义分组
  for (const [groupId, group] of Object.entries(groups)) {
    if (groupId === 'system') continue;

    html += `
      <div class="group-card" data-group-id="${groupId}">
        <span style="font-size: 13px;">📁</span>
        <input
          type="text"
          value="${group.name}"
          placeholder="Group name"
          data-group-id="${groupId}"
          class="group-name-input"
        />
        <button class="btn success save-group-btn" data-group-id="${groupId}">💾 Save</button>
        <button class="btn danger delete-group-btn" data-group-id="${groupId}">🗑</button>
      </div>
    `;
  }

  // Ungrouped (不可删除)
  html += `
    <div class="group-card">
      <span style="color: #6b7280; font-weight: 500; font-size: 13px;">📁 Ungrouped (default)</span>
    </div>
  `;

  $container.innerHTML = html;

  // 新建分组按钮事件
  const createBtn = document.getElementById('createGroupBtn');
  const newGroupInput = document.getElementById('newGroupInput');

  createBtn.addEventListener('click', () => {
    const groupName = newGroupInput.value.trim();
    if (!groupName) {
      showMessage('Please enter a group name', 'error');
      return;
    }

    const groupId = `group_${Date.now()}`;
    groups[groupId] = { name: groupName };

    showMessage(`Group "${groupName}" created successfully!`, 'success');
    renderGroups();
    renderCardGrid();
  });

  // 回车键创建分组
  newGroupInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      createBtn.click();
    }
  });

  // 绑定保存按钮
  $container.querySelectorAll('.save-group-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const groupId = btn.dataset.groupId;
      const input = $container.querySelector(`.group-name-input[data-group-id="${groupId}"]`);
      const newName = input.value.trim();

      if (!newName) {
        showMessage('Group name cannot be empty', 'error');
        return;
      }

      groups[groupId].name = newName;
      showMessage(`Group renamed to "${newName}"`, 'success');
      renderCardGrid();
    });
  });

  // 绑定删除按钮
  $container.querySelectorAll('.delete-group-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const groupId = btn.dataset.groupId;
      if (confirm(`Delete group "${groups[groupId].name}"? Labels will move to Ungrouped.`)) {
        const groupName = groups[groupId].name;
        // 删除分组，移除标签关联
        delete groups[groupId];
        for (const [labelId, gid] of Object.entries(labelGroups)) {
          if (gid === groupId) {
            delete labelGroups[labelId];
          }
        }
        showMessage(`Group "${groupName}" deleted`, 'success');
        renderGroups();
        renderCardGrid();
      }
    });
  });
}

// 创建标签卡片
function createLabelCard(label) {
  const card = document.createElement('div');
  card.className = 'label-card';
  card.dataset.labelId = label.id;
  card.dataset.realName = label.name;
  card.draggable = true;  // 启用拖拽

  const displayName = displayNameMap[label.name] || label.name;
  const isHidden = hidden.has(label.name);
  const isSelected = selectedLabels.has(label.id);

  if (isSelected) {
    card.classList.add('selected');
  }

  card.innerHTML = `
    <input type="checkbox" class="card-select-checkbox" ${isSelected ? 'checked' : ''} title="Select this label">
    <div class="card-hidden-section">
      <input type="checkbox" class="card-hidden-toggle checkbox" ${isHidden ? 'checked' : ''} title="Hide this label from the panel" id="hidden-${label.id}">
      <label for="hidden-${label.id}" style="font-size: 11px; color: #6b7280; cursor: pointer; user-select: none;">Hidden</label>
    </div>
    <div class="card-content">
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
        <span class="type-badge ${label.type}">${label.type === 'user' ? 'USER' : 'SYSTEM'}</span>
        <div class="card-real-name" title="${label.name}">${label.name}</div>
      </div>
      <input
        type="text"
        class="card-display-name"
        value="${displayName}"
        placeholder="Display name"
      />
    </div>
  `;

  // 多选复选框事件
  const selectCheckbox = card.querySelector('.card-select-checkbox');
  selectCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      selectedLabels.add(label.id);
      card.classList.add('selected');
    } else {
      selectedLabels.delete(label.id);
      card.classList.remove('selected');
    }
    renderCardGrid(); // 重新渲染以显示/隐藏工具栏
  });

  // 显示名称输入事件
  const displayNameInput = card.querySelector('.card-display-name');
  displayNameInput.addEventListener('input', (e) => {
    const newValue = e.target.value.trim();
    if (newValue && newValue !== label.name) {
      displayNameMap[label.name] = newValue;
    } else {
      delete displayNameMap[label.name];
    }
    updateStats();
  });

  // 隐藏复选框事件
  const hiddenCheckbox = card.querySelector('.card-hidden-toggle');
  hiddenCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      hidden.add(label.name);
    } else {
      hidden.delete(label.name);
    }
    updateStats();
  });

  // 拖拽事件
  card.addEventListener('dragstart', (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', label.id);
    card.classList.add('dragging');
  });

  card.addEventListener('dragend', (e) => {
    card.classList.remove('dragging');
  });

  return card;
}

// 创建分组列
function createGroupColumn(groupId, groupName, labels) {
  const column = document.createElement('div');
  column.className = 'group-column';

  const isCollapsed = collapsedGroups.has(groupId);
  if (isCollapsed) {
    column.classList.add('group-collapsed');
  }

  const header = document.createElement('div');
  header.className = 'group-header';
  header.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span class="group-collapse-toggle">${isCollapsed ? '▶' : '▼'}</span>
      <span>${groupName}</span>
    </div>
    <span class="label-count">${labels.length}</span>
  `;

  // 点击header切换收起/展开
  header.addEventListener('click', () => {
    if (collapsedGroups.has(groupId)) {
      collapsedGroups.delete(groupId);
    } else {
      collapsedGroups.add(groupId);
    }
    saveConfig();
    renderCardGrid();
  });

  const dropZone = document.createElement('div');
  dropZone.className = 'group-drop-zone';
  dropZone.dataset.groupId = groupId;

  // 拖拽进入事件
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const dragging = document.querySelector('.dragging');
    if (!dragging) return;

    const afterElement = getDragAfterElement(dropZone, e.clientY);
    if (afterElement == null) {
      dropZone.appendChild(dragging);
    } else {
      dropZone.insertBefore(dragging, afterElement);
    }
  });

  // 放置事件
  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    const labelId = e.dataTransfer.getData('text/plain');

    // 等待 DOM 更新完成再读取顺序
    requestAnimationFrame(() => {
      requestAnimationFrame(async () => {
        // 现在 DOM 已确保更新完成
        updateLabelOrder(groupId, dropZone);
        await saveConfig();
        console.log(`[Order] Saved for ${groupId}:`, order[groupId]);
        showMessage('Label order updated', 'success');
      });
    });
  });

  // 按排序渲染labels（如果有排序数据）
  const sortedLabels = getSortedLabels(labels, groupId);

  if (sortedLabels.length === 0) {
    dropZone.innerHTML = '<div class="group-empty">No labels in this group</div>';
  } else {
    sortedLabels.forEach(label => {
      const card = createLabelCard(label);
      dropZone.appendChild(card);
    });
  }

  column.appendChild(header);
  column.appendChild(dropZone);
  return column;
}

// 辅助函数 - 获取鼠标下方的元素
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.label-card:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;

    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// 辅助函数 - 根据排序获取标签
function getSortedLabels(labels, groupId) {
  if (!order[groupId] || order[groupId].length === 0) {
    console.log(`[Order] No saved order for ${groupId}, using alphabetical`);
    // 无排序数据，按字母顺序
    return labels.sort((a, b) => a.name.localeCompare(b.name));
  }

  console.log(`[Order] Applying saved order for ${groupId}:`, order[groupId]);

  const orderMap = {};
  order[groupId].forEach((labelId, index) => {
    orderMap[labelId] = index;
  });

  const sorted = labels.sort((a, b) => {
    const orderA = orderMap[a.id] !== undefined ? orderMap[a.id] : 999999;
    const orderB = orderMap[b.id] !== undefined ? orderMap[b.id] : 999999;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);  // 相同顺序时按名称排序
  });

  console.log(`[Order] Sorted ${labels.length} labels for ${groupId}`);
  return sorted;
}

// 辅助函数 - 更新标签排序
function updateLabelOrder(groupId, dropZone) {
  const cards = dropZone.querySelectorAll('.label-card');
  const newOrder = Array.from(cards).map(card => card.dataset.labelId);

  console.log(`[Order] Updating ${groupId}: ${newOrder.length} labels`);
  console.log('[Order] New order:', newOrder);

  // 验证：确保获得了有效的 label ID
  if (newOrder.length === 0) {
    console.warn(`[Order] Warning: No labels found in ${groupId}`);
  }
  if (newOrder.some(id => !id)) {
    console.error('[Order] Error: Some label IDs are undefined!');
  }

  order[groupId] = newOrder;
}

// 渲染多选工具栏
function renderMultiSelectToolbar() {
  if (selectedLabels.size === 0) return null;

  // 获取所有分组选项
  const groupOptions = [
    ...Object.entries(groups).map(([id, g]) => ({ id, name: g.name })),
    { id: 'system', name: 'System' },
    { id: 'ungrouped', name: 'Ungrouped' }
  ];

  const toolbar = document.createElement('div');
  toolbar.className = 'multi-select-toolbar';
  toolbar.innerHTML = `
    <span><strong>${selectedLabels.size}</strong> items selected</span>
    <select id="targetGroupSelect">
      <option value="">Select group...</option>
      ${groupOptions.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
    </select>
    <button class="btn primary" id="sendToGroupBtn">Send to Group</button>
    <button class="btn" id="cancelSelectionBtn">Cancel</button>
  `;

  // 绑定事件
  setTimeout(() => {
    const sendBtn = document.getElementById('sendToGroupBtn');
    const cancelBtn = document.getElementById('cancelSelectionBtn');
    const selectEl = document.getElementById('targetGroupSelect');

    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        const targetGroupId = selectEl.value;
        if (!targetGroupId) {
          showMessage('Please select a target group', 'error');
          return;
        }

        // 移动所有选中的标签到目标分组
        let movedCount = 0;
        selectedLabels.forEach(labelId => {
          if (targetGroupId === 'ungrouped') {
            delete labelGroups[labelId];
          } else {
            labelGroups[labelId] = targetGroupId;
          }
          movedCount++;
        });

        selectedLabels.clear();
        showMessage(`Moved ${movedCount} label(s) to group`, 'success');
        renderCardGrid();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        selectedLabels.clear();
        renderCardGrid();
      });
    }
  }, 0);

  return toolbar;
}

// 渲染卡片网格
function renderCardGrid() {
  const $container = document.getElementById('labelTableContainer');

  // 过滤标签
  const filteredLabels = allLabels.filter(label => {
    if (!searchText) return true;
    const query = searchText.toLowerCase();
    const displayName = (displayNameMap[label.name] || label.name).toLowerCase();
    const realName = label.name.toLowerCase();
    return displayName.includes(query) || realName.includes(query);
  });

  if (filteredLabels.length === 0) {
    $container.innerHTML = '<div class="empty">No matching labels</div>';
    return;
  }

  // 按分组组织标签
  const groupedLabels = {
    system: [],
    ungrouped: [],
    ...Object.keys(groups).reduce((acc, gid) => ({ ...acc, [gid]: [] }), {})
  };

  filteredLabels.forEach(label => {
    const groupId = labelGroups[label.id] ||
                   (label.type === 'system' ? 'system' : 'ungrouped');
    if (groupedLabels[groupId]) {
      groupedLabels[groupId].push(label);
    } else {
      // 如果分组不存在，放入未分组
      groupedLabels.ungrouped.push(label);
    }
  });

  // 创建网格容器
  const grid = document.createElement('div');
  grid.id = 'labelGridContainer';

  // 渲染多选工具栏（如果有选中项）
  const toolbar = renderMultiSelectToolbar();
  if (toolbar) {
    grid.appendChild(toolbar);
  }

  // 按顺序渲染分组列：自定义分组 -> System -> Ungrouped
  const groupOrder = [...Object.keys(groups), 'system', 'ungrouped'];

  groupOrder.forEach(groupId => {
    const labels = groupedLabels[groupId] || [];

    const groupName = groupId === 'system' ? 'System' :
                     groupId === 'ungrouped' ? 'Ungrouped' :
                     groups[groupId].name;

    const column = createGroupColumn(groupId, groupName, labels);
    grid.appendChild(column);
  });

  $container.innerHTML = '';
  $container.appendChild(grid);

  updateStats();
}

// 加载标签
async function loadLabels() {
  const $container = document.getElementById('labelTableContainer');
  $container.innerHTML = '<div class="loading">Loading labels...</div>';

  const response = await fetchLabels();

  if (!response.ok) {
    $container.innerHTML = `<div class="empty">Load failed: ${response.error}</div>`;
    showMessage('Failed to load labels, check authorization', 'error');
    return;
  }

  allLabels = response.labels || [];

  // 关键：等待配置加载完成后再渲染
  await loadConfig();
  console.log('[Order] Loaded order config:', order);

  renderGroups();
  renderCardGrid();
  updateAuthStatus();
}

// 保存设置
async function save() {
  await saveConfig();
  showMessage('Settings saved successfully', 'success');
}

// 重置设置
function reset() {
  if (!confirm('Reset all settings? This will clear all renames, groups, and hide configurations.')) {
    return;
  }

  displayNameMap = {};
  order = {};  // 修改：从[]改为{}，保持对象类型一致
  hidden = new Set();
  groups = {};
  labelGroups = {};

  saveConfig().then(() => {
    showMessage('Settings reset', 'success');
    renderGroups();
    renderCardGrid();
  });
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  // 加载 Client ID
  loadClientId();

  updateAuthStatus();
  loadLabels();

  // Client ID 保存按钮
  document.getElementById('saveClientIdBtn').addEventListener('click', saveClientId);

  // 搜索
  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchText = e.target.value.trim();
    renderCardGrid();
  });

  // 按钮事件
  document.getElementById('saveBtn').addEventListener('click', save);
  document.getElementById('resetBtn').addEventListener('click', reset);
  document.getElementById('refreshBtn').addEventListener('click', loadLabels);

  // 导入导出按钮事件
  document.getElementById('exportBtn').addEventListener('click', exportConfiguration);

  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });

  document.getElementById('importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      importConfiguration(file);
    }
    e.target.value = '';  // 清空，允许重复导入同一文件
  });
});
