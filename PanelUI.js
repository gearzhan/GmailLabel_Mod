// PanelUI.js - Handles Shadow DOM UI rendering and events

class PanelUI {
    constructor(state, styles, callbacks) {
        this.state = state;
        this.styles = styles;
        this.callbacks = callbacks || {};
        this.shadow = null;
        this.host = null;
    }

    inject(onToggleCallback) {
        // Create host element
        this.host = document.createElement('div');
        this.host.id = 'mlp-root';

        // Create Shadow DOM
        this.shadow = this.host.attachShadow({ mode: 'open' });

        // Initial render
        this.render();

        document.body.appendChild(this.host);

        // Setup global listeners (toast)
        window.addEventListener('mlp-toast', (e) => {
            this.showToast(e.detail.message, e.detail.type);
        });

        // Initial position
        this.updatePosition();
        this.updateCollapseState();
    }

    escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    render() {
        if (!this.shadow) return;

        // Use externalized styles + dynamic HTML
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
      <style>${this.styles}</style>
      <div class="card ${this.state.panelCollapsed ? 'panel-collapsed' : ''}" id="panel">
        <div class="panel-content">
          <div id="errorContainer"></div>
          <div class="label-list" id="labelList">
            <div class="loading">Loading labels...</div>
          </div>
          <div class="controls">
            <div class="filter-container">
              <svg class="filter-icon" width="16" height="16" viewBox="0 0 128 128" fill="currentColor">
                <path d="M42 60L52 70L70 45" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <input type="search" class="filter-input" id="filterInput" placeholder="Filter labels..." value="${this.state.filterText || ''}"/>
            </div>
            <div class="mode-switch ${this.state.mode === 'OR' ? 'mode-any' : ''}" id="modeSwitch">
              <div class="toggle-pill"></div>
              <button class="mode-option ${this.state.mode === 'AND' ? 'active' : ''}" data-val="AND">AND</button>
              <button class="mode-option ${this.state.mode === 'OR' ? 'active' : ''}" data-val="OR">OR</button>
            </div>
          </div>
          <div class="action-bar">
            <button class="btn text-link" id="clearBtn">Clear</button>
            <button class="btn primary" id="searchBtn">Search</button>
          </div>
        </div>
        <button class="collapse-toggle" id="collapseBtn" title="${this.state.panelCollapsed ? 'Expand panel' : 'Collapse panel'}">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
          </svg>
        </button>
      </div>
    `;

        // Clear and append
        this.shadow.innerHTML = '';
        this.shadow.appendChild(wrapper);

        this.bindEvents();
        this.renderLabelList(); // Initial empty/loading state
    }

    // Update just the label list (perf optimization)
    renderLabelList() {
        const $labelList = this.shadow.getElementById('labelList');
        if (!$labelList) return;

        if (this.state.allLabels.length === 0) {
            // Loading or empty
            return;
        }

        // Filter logic
        const filter = (this.state.filterText || '').toLowerCase();

        // Organize by groups
        const groups = { ...this.state.groups };
        const groupContent = {};

        // Sort logic here (simplified for this refactor, relying on state)
        // ... (This logic is moved from content.js, see below helper)

        let html = '';

        // Helper to generate Label HTML
        const generateLabelHtml = (label) => {
            const isSelected = this.state.selected.has(label.name);
            const displayName = this.callbacks.getDisplayName ? this.callbacks.getDisplayName(label.name) : label.name;
            // Logic for nesting...
            const isNested = label.name.includes('/');

            let colorStyle = '';
            if (this.callbacks.getLabelColor) {
                const colors = this.callbacks.getLabelColor(label.id);
                if (colors.backgroundColor) {
                    // Determine if we should use custom colors. 
                    // For simplicity in this refactor, keeping it simple or verifying if we want to copy all that logic.
                    // Copying the color logic:
                    if (colors.backgroundColor) {
                        colorStyle = `style="background-color: ${colors.backgroundColor}; color: ${colors.textColor}"`;
                    }
                }
            }

            return `
          <div class="label-item ${isSelected ? 'selected' : ''} ${isNested ? 'nested-label' : ''}"
               data-id="${label.id}"
               data-name="${label.name}"
               ${colorStyle}
               draggable="true">
            ${this.escapeHtml(displayName)}
          </div>
        `;
        };

        // Filter and Group Logic (Ported from content.js)
        const visibleLabels = this.state.allLabels.filter(label => {
            if (this.callbacks.isHidden && this.callbacks.isHidden(label.name)) return false;
            if (!filter) return true;
            const dName = this.callbacks.getDisplayName ? this.callbacks.getDisplayName(label.name) : label.name;
            return dName.toLowerCase().includes(filter);
        });

        // Bucket into groups
        visibleLabels.forEach(label => {
            let groupId = 'ungrouped';
            if (this.callbacks.getGroupId) {
                groupId = this.callbacks.getGroupId(label.id) || 'ungrouped';
            }
            if (!groupContent[groupId]) groupContent[groupId] = [];
            groupContent[groupId].push(label);
        });

        // Render Groups
        const groupOrder = ['system', ...Object.keys(groups).filter(k => k !== 'system'), 'ungrouped'];

        groupOrder.forEach(groupId => {
            const labels = groupContent[groupId] || [];
            if (labels.length === 0) return;

            // Sort labels (using callback)
            const sortedLabels = this.callbacks.sortLabels ? this.callbacks.sortLabels(labels, groupId) : labels;

            // Group Header
            let headerHtml = '';
            if (groupId !== 'ungrouped') {
                const groupName = groups[groupId]?.name || groupId;
                headerHtml = `
               <div class="group-header" data-group-id="${groupId}">
                 <span class="group-toggle">▼</span>
                 <span class="group-name">${this.escapeHtml(groupName)}</span>
                 <span class="group-count">${labels.length}</span>
               </div>
             `;
            }

            const labelsHtml = sortedLabels.map(generateLabelHtml).join('');

            html += `
          <div class="label-group">
            ${headerHtml}
            <div class="group-labels">
              ${labelsHtml}
            </div>
          </div>
        `;
        });

        if (!html) {
            html = '<div class="empty-state">No matching labels</div>';
        }

        $labelList.innerHTML = html;

        // Re-bind label events
        $labelList.querySelectorAll('.label-item').forEach(item => {
            item.addEventListener('click', () => {
                const name = item.dataset.name;
                this.callbacks.onLabelClick(name);
                this.renderLabelList(); // Re-render to update selection
            });

            // Drag start forDnD
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('application/x-gmail-mlp-label-id', item.dataset.id);
                e.dataTransfer.setData('application/x-gmail-mlp-label-name', item.dataset.name);
            });
        });
    }

    bindEvents() {
        const $filterInput = this.shadow.getElementById('filterInput');
        const $modeSwitch = this.shadow.getElementById('modeSwitch');
        const $clearBtn = this.shadow.getElementById('clearBtn');
        const $searchBtn = this.shadow.getElementById('searchBtn');
        const $collapseBtn = this.shadow.getElementById('collapseBtn');
        const $panel = this.shadow.getElementById('panel');

        // Filter
        $filterInput.addEventListener('input', (e) => {
            this.state.filterText = e.target.value;
            this.renderLabelList();
        });

        // Mode Switch
        $modeSwitch.querySelectorAll('.mode-option').forEach(btn => {
            btn.addEventListener('click', () => {
                this.state.mode = btn.dataset.val;

                // Update UI
                $modeSwitch.querySelectorAll('.mode-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (this.state.mode === 'OR') {
                    $modeSwitch.classList.add('mode-any');
                } else {
                    $modeSwitch.classList.remove('mode-any');
                }
            });
        });

        // Clear
        $clearBtn.addEventListener('click', () => {
            this.state.selected.clear();
            this.renderLabelList();
        });

        // Search
        $searchBtn.addEventListener('click', () => {
            this.callbacks.onSearch();
        });

        // Collapse Toggle
        let mouseupTriggeredToggle = false;

        const togglePanel = () => {
            this.state.panelCollapsed = !this.state.panelCollapsed;
            this.updateCollapseState();
            this.callbacks.onCollapseChange(this.state.panelCollapsed);
        };

        $collapseBtn.addEventListener('click', () => {
            if (mouseupTriggeredToggle) {
                mouseupTriggeredToggle = false;
                return;
            }
            togglePanel();
        });

        // Dragging Logic for the Button
        let isDragging = false;
        let isRealDrag = false;
        let dragStartX, dragStartY;
        let originalX, originalY;
        let dragStartTime = 0;

        $collapseBtn.addEventListener('mousedown', (e) => {
            if (!this.state.panelCollapsed) return;
            mouseupTriggeredToggle = false;
            isDragging = true;
            isRealDrag = false;
            dragStartTime = Date.now();
            dragStartX = e.clientX;
            dragStartY = e.clientY;

            const rect = this.host.getBoundingClientRect();
            // Calculate original position relative to viewport (since it's fixed)
            // Actually we just need current left/bottom from style
            originalX = rect.left;
            originalY = window.innerHeight - rect.bottom;

            $collapseBtn.classList.add('dragging');
            e.preventDefault();
            e.stopPropagation();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const deltaX = e.clientX - dragStartX;
            const deltaY = dragStartY - e.clientY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (!isRealDrag && (Date.now() - dragStartTime > 300 || distance > 5)) {
                isRealDrag = true;
            }

            if (isRealDrag) {
                this.host.style.transition = 'none';
                this.host.style.left = `${originalX + deltaX}px`;
                this.host.style.bottom = `${originalY + deltaY}px`;
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (!isDragging) return;
            $collapseBtn.classList.remove('dragging');

            if (isRealDrag) {
                this.callbacks.onSnap(this.host);
                e.preventDefault();
                e.stopPropagation();
            } else if (this.state.panelCollapsed) {
                togglePanel();
                mouseupTriggeredToggle = true;
                e.preventDefault();
                e.stopPropagation();
            }
            isDragging = false;
            isRealDrag = false;
        });
    }

    updateCollapseState() {
        const $panel = this.shadow.getElementById('panel');
        const $collapseBtn = this.shadow.getElementById('collapseBtn');
        if (!this.host || !$panel) return;

        if (this.state.panelCollapsed) {
            $panel.classList.add('panel-collapsed');
            $collapseBtn.title = 'Expand panel';
            this.host.style.width = '32px';
        } else {
            $panel.classList.remove('panel-collapsed');
            $collapseBtn.title = 'Collapse panel';
            this.host.style.width = '320px';
        }

        // Update toggle position
        this.updatePosition();
    }

    updatePosition() {
        // In this refactor we rely on css host fixed positioning, 
        // but the draggable button needs to be visually sync inside the shadow dom? 
        // Actually the button is INSIDE the shadow dom, relative to the card.
        // But the CARD is what collapses.
        // The CSS provided in styles.js handles .collapse-toggle position: fixed; 
        // Wait, if it's position fixed inside shadow dom, it is relative to viewport? 
        // Shadow DOM doesn't isolate fixed position from viewport unless host has transform/containment.
        // The original code had: $collapseBtn.style.left = ...

        const $collapseBtn = this.shadow?.getElementById('collapseBtn');
        if ($collapseBtn) {
            $collapseBtn.style.left = `${this.state.panelPosition.x}px`;
            $collapseBtn.style.bottom = `${this.state.panelPosition.y}px`;
        }
    }

    showToast(message, type = 'success') {
        if (!this.shadow) return;

        const toast = document.createElement('div');
        toast.className = `mlp-toast mlp-toast-${type}`;
        toast.textContent = message;

        // Add Undo button if needed? (Future improvement)

        this.shadow.appendChild(toast);

        // Trigger reflow
        toast.offsetHeight;

        requestAnimationFrame(() => {
            toast.classList.add('mlp-toast-show');
        });

        setTimeout(() => {
            toast.classList.remove('mlp-toast-show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
}
