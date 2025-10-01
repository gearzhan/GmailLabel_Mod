// Options Page Script - Label management and configuration

let allLabels = [];
let displayNameMap = {};
let order = [];
let hidden = new Set();
let searchText = '';
let groups = {}; // { groupId: { name: string } }
let labelGroups = {}; // { labelId: groupId }

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
      'labelGroups'
    ], (data) => {
      displayNameMap = data.displayNameMap || {};
      order = data.order || [];
      hidden = new Set(data.hidden || []);
      groups = data.groups || {};
      labelGroups = data.labelGroups || {};
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
        labelGroups
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

  // 显示 System 组（不可删除）
  html += `
    <div class="group-card">
      <span style="color: #6b7280; font-weight: 500;">📁 System (built-in)</span>
    </div>
  `;

  // 显示自定义分组
  for (const [groupId, group] of Object.entries(groups)) {
    if (groupId === 'system') continue;

    html += `
      <div class="group-card" data-group-id="${groupId}">
        <input
          type="text"
          value="${group.name}"
          placeholder="Group name"
          data-group-id="${groupId}"
          class="group-name-input"
        />
        <button class="btn danger delete-group-btn" data-group-id="${groupId}">🗑 Delete</button>
      </div>
    `;
  }

  // Ungrouped (不可删除)
  html += `
    <div class="group-card">
      <span style="color: #6b7280; font-weight: 500;">📁 Ungrouped (default)</span>
    </div>
  `;

  $container.innerHTML = html;

  // 绑定分组名称修改事件
  $container.querySelectorAll('.group-name-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const groupId = e.target.dataset.groupId;
      const newName = e.target.value.trim();
      if (newName && groups[groupId]) {
        groups[groupId].name = newName;
      }
    });
  });

  // 绑定删除按钮
  $container.querySelectorAll('.delete-group-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const groupId = btn.dataset.groupId;
      if (confirm(`Delete group "${groups[groupId].name}"? Labels will move to Ungrouped.`)) {
        // 删除分组，移除标签关联
        delete groups[groupId];
        for (const [labelId, gid] of Object.entries(labelGroups)) {
          if (gid === groupId) {
            delete labelGroups[labelId];
          }
        }
        renderGroups();
        renderTable();
      }
    });
  });
}

// 添加新分组
function addNewGroup() {
  const groupName = prompt('Enter new group name:');
  if (!groupName || !groupName.trim()) return;

  const groupId = `group_${Date.now()}`;
  groups[groupId] = { name: groupName.trim() };

  renderGroups();
  renderTable();
}

// 渲染标签表格
function renderTable() {
  const $container = document.getElementById('labelTableContainer');

  // 过滤标签
  let items = allLabels
    .filter(label => {
      if (!searchText) return true;
      const query = searchText.toLowerCase();
      const displayName = (displayNameMap[label.name] || label.name).toLowerCase();
      const realName = label.name.toLowerCase();
      return displayName.includes(query) || realName.includes(query);
    })
    .map((label, index) => ({
      real: label.name,
      show: displayNameMap[label.name] || label.name,
      type: label.type,
      id: label.id,
      index
    }));

  if (items.length === 0) {
    $container.innerHTML = '<div class="empty">No matching labels</div>';
    return;
  }

  // 获取所有分组选项
  const groupOptions = [
    { id: 'system', name: 'System' },
    ...Object.entries(groups).map(([id, g]) => ({ id, name: g.name })),
    { id: 'ungrouped', name: 'Ungrouped' }
  ];

  // 构建表格
  const table = document.createElement('table');
  table.className = 'label-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th style="width: 25%;">Real Name</th>
        <th style="width: 25%;">Display Name</th>
        <th style="width: 15%;">Type</th>
        <th style="width: 20%;">Group</th>
        <th style="width: 80px;">Hide</th>
      </tr>
    </thead>
    <tbody id="labelTableBody"></tbody>
  `;

  const tbody = table.querySelector('tbody');

  items.forEach((item) => {
    const row = document.createElement('tr');
    row.dataset.realName = item.real;
    row.dataset.labelId = item.id;

    // 获取当前标签的分组
    const currentGroup = labelGroups[item.id] ||
                        (item.type === 'system' ? 'system' : 'ungrouped');

    // 构建分组下拉选项
    let groupOptionsHTML = '';
    groupOptions.forEach(opt => {
      const selected = opt.id === currentGroup ? 'selected' : '';
      groupOptionsHTML += `<option value="${opt.id}" ${selected}>${opt.name}</option>`;
    });

    row.innerHTML = `
      <td>
        <div class="label-real" title="${item.real}">${item.real}</div>
      </td>
      <td>
        <input
          type="text"
          class="label-input display-name-input"
          value="${item.show}"
          placeholder="Use real name"
        />
      </td>
      <td>
        <span style="font-size: 12px; color: #9ca3af;">
          ${item.type === 'user' ? 'User' : 'System'}
        </span>
      </td>
      <td>
        <select class="group-select">
          ${groupOptionsHTML}
        </select>
      </td>
      <td style="text-align: center;">
        <input
          type="checkbox"
          class="checkbox hidden-checkbox"
          ${hidden.has(item.real) ? 'checked' : ''}
        />
      </td>
    `;

    // 显示名称变化
    row.querySelector('.display-name-input').addEventListener('input', (e) => {
      const newValue = e.target.value.trim();
      if (newValue && newValue !== item.real) {
        displayNameMap[item.real] = newValue;
      } else {
        delete displayNameMap[item.real];
      }
      updateStats();
    });

    // 分组选择变化
    row.querySelector('.group-select').addEventListener('change', (e) => {
      const newGroupId = e.target.value;
      if (newGroupId === 'ungrouped') {
        delete labelGroups[item.id];
      } else {
        labelGroups[item.id] = newGroupId;
      }
    });

    // 隐藏状态变化
    row.querySelector('.hidden-checkbox').addEventListener('change', (e) => {
      if (e.target.checked) {
        hidden.add(item.real);
      } else {
        hidden.delete(item.real);
      }
      updateStats();
    });

    tbody.appendChild(row);
  });

  $container.innerHTML = '';
  $container.appendChild(table);

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
  await loadConfig();
  renderGroups();
  renderTable();
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
  order = [];
  hidden = new Set();
  groups = {};
  labelGroups = {};

  saveConfig().then(() => {
    showMessage('Settings reset', 'success');
    renderGroups();
    renderTable();
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

  // 添加分组按钮
  document.getElementById('addGroupBtn').addEventListener('click', addNewGroup);

  // 搜索
  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchText = e.target.value.trim();
    renderTable();
  });

  // 按钮事件
  document.getElementById('saveBtn').addEventListener('click', save);
  document.getElementById('resetBtn').addEventListener('click', reset);
  document.getElementById('refreshBtn').addEventListener('click', loadLabels);
});
