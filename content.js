// Content Script - Main Entry Point

// Global State
const STATE = {
  allLabels: [],
  selected: new Set(),
  mode: 'AND',
  filterText: '',
  groups: {},
  panelCollapsed: true, // Default
  panelPosition: { x: 12, y: 16 }
};

// Services
const gmailAdapter = new GmailAdapter();
let panelUI = null;
let dragDropHandler = null;

// Account Key Helper
function getAccountIndex() {
  const match = location.pathname.match(/\/u\/(\d+)/);
  return match ? match[1] : '0';
}

function getAccountKey() {
  return `u${getAccountIndex()}`;
}

// Config Loader
async function loadConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([
      'panelCollapsed',
      'panelPosition',
      'displayNameMap',
      'order',
      'hidden',
      'groups',
      'labelGroups'
    ], (data) => {
      if (data.panelCollapsed !== undefined) STATE.panelCollapsed = data.panelCollapsed;
      if (data.panelPosition) STATE.panelPosition = data.panelPosition;
      STATE.groups = data.groups || {};
      STATE.displayNameMap = data.displayNameMap || {};
      STATE.order = data.order || {};
      STATE.hidden = new Set(data.hidden || []);
      STATE.labelGroups = data.labelGroups || {};
      resolve();
    });
  });
}

// Label Fetcher
async function getLabels() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: 'GET_LABELS',
      accountKey: getAccountKey()
    }, (response) => {
      resolve(response);
    });
  });
}

// Business Logic: Sorting
function getSortedLabelsForGroup(labels, groupId) {
  if (!STATE.order[groupId] || STATE.order[groupId].length === 0) {
    return labels.sort((a, b) => a.name.localeCompare(b.name));
  }
  const orderMap = {};
  STATE.order[groupId].forEach((id, idx) => orderMap[id] = idx);

  return labels.sort((a, b) => {
    const oa = orderMap[a.id] !== undefined ? orderMap[a.id] : 999999;
    const ob = orderMap[b.id] !== undefined ? orderMap[b.id] : 999999;
    return oa - ob || a.name.localeCompare(b.name);
  });
}

// Business Logic: Color
async function getLabelColorMap() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['labelColorMap'], (data) => resolve(data.labelColorMap || {}));
  });
}
let labelColorMap = {};

// Main Injection
async function init() {
  await loadConfig();
  labelColorMap = await getLabelColorMap();

  // Instantiate UI
  panelUI = new PanelUI(STATE, MLP_STYLES, {
    onCollapseChange: (collapsed) => {
      chrome.storage.sync.set({ panelCollapsed: collapsed });
    },
    onSnap: (host) => {
      gmailAdapter.snapToEdge(host, (pos) => {
        STATE.panelPosition = pos;
        chrome.storage.sync.set({ panelPosition: pos });
        panelUI.updatePosition();
      });
    },
    getDisplayName: (name) => STATE.displayNameMap[name] || name,
    isHidden: (name) => STATE.hidden.has(name),
    getGroupId: (id) => STATE.labelGroups[id] || (STATE.allLabels.find(l => l.id === id)?.type === 'system' ? 'system' : 'ungrouped'),
    getLabelColor: (id) => labelColorMap[id] || {},
    sortLabels: getSortedLabelsForGroup,
    onLabelClick: (name) => {
      if (STATE.selected.has(name)) STATE.selected.delete(name);
      else STATE.selected.add(name);
    },
    onSearch: () => {
      // Build Query
      const terms = Array.from(STATE.selected).map(labelName => {
        // Encode label name logic (simplified)
        const safeName = labelName.replace(/ /g, '-').replace(/&/g, '-');
        return `label:${safeName}`;
      });

      let query = '';
      if (terms.length > 0) {
        if (STATE.mode === 'OR') {
          query = `{${terms.join(' ')}}`;
        } else {
          query = terms.join(' ');
        }
      }

      if (query) {
        // Navigate
        const accountIndex = getAccountIndex();
        const searchUrl = `https://mail.google.com/mail/u/${accountIndex}/#search/${encodeURIComponent(query)}`;
        window.location.href = searchUrl;
      }
    }
  });

  // Inject UI
  panelUI.inject();

  // Load Labels
  const response = await getLabels();
  if (response.ok) {
    STATE.allLabels = response.labels || [];
    // Ensure system group exists
    if (!STATE.groups['system']) {
      STATE.groups['system'] = { name: 'System', labelIds: [] };
    }
    panelUI.renderLabelList();
  } else {
    // Handle error? UI handles empty/loading state.
    console.error('Failed to load labels:', response.error);
  }

  // Init DnD
  dragDropHandler = new DragDropHandler(gmailAdapter, getAccountKey);
  dragDropHandler.init();
}

// Bootstrap
(async function main() {
  if (!location.hostname.includes('mail.google.com')) return;
  console.log('[Multi-Label Picker] Waiting for Gmail...');

  await gmailAdapter.waitForGmailReady();
  console.log('[Multi-Label Picker] Gmail loaded. Initializing...');

  init();
})();
