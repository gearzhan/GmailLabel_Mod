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
      
      <!-- Morph Wrapper: Acts as FAB when collapsed, Container when expanded -->
      <div class="morph-wrapper ${this.state.panelCollapsed ? 'collapsed' : ''}" id="morphWrapper">
        
        <!-- FAB Icon (Visible when collapsed) -->
        <div class="fab-icon" title="Open Label Manager">
           <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
             <path d="M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16zM16 17H5V7h11l3.55 5L16 17z"/>
           </svg>
        </div>

        <!-- Main Card (Visible when expanded) -->
        <div class="card" id="panel">
          
          <!-- Header Area with Drag & Close -->
          <div class="panel-header">
             <div class="drag-handle" id="dragHandle" title="Drag to move">
               <div class="drag-handle-bar"></div>
             </div>
             <div class="header-controls">
                <button class="btn-icon-sm" id="collapseBtn" title="Minimize">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H5v-2h14v2z"/></svg>
                </button>
             </div>
          </div>

          <div class="panel-content">
            <div id="errorContainer"></div>
            
            <div class="label-list" id="labelList">
              <div class="loading">Loading labels...</div>
            </div>

            <!-- Footer Controls -->
            <div class="footer">
              
              <!-- Row 1: Filter -->
              <div class="search-row">
                 <svg class="filter-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                   <circle cx="11" cy="11" r="8"></circle>
                   <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                 </svg>
                 <input type="search" class="filter-input" id="filterInput" placeholder="Filter labels..." value="${this.state.filterText || ''}"/>
              </div>

              <!-- Row 2: Actions & Mode -->
              <div class="controls-row">
                 <div class="left-controls">
                    <div class="mode-switch ${this.state.mode === 'OR' ? 'mode-or' : ''}" id="modeSwitch" title="Switch Match Mode">
                      <div class="toggle-pill"></div>
                      <button class="mode-btn ${this.state.mode === 'AND' ? 'active' : ''}" data-val="AND">AND</button>
                      <button class="mode-btn ${this.state.mode === 'OR' ? 'active' : ''}" data-val="OR">OR</button>
                    </div>
                 </div>

                 <div class="right-controls">
                    <button class="btn-icon" id="clearBtn" title="Clear Selection">
                       <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                    <button class="btn-primary" id="searchBtn">
                       Search
                    </button>
                 </div>
              </div>
            </div>

          </div>
        </div>
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
        if (!this.state.groupCollapsed) this.state.groupCollapsed = {};

        const groups = { ...this.state.groups };
        const groupContent = {};

        // Helper to generate Label HTML
        const generateLabelHtml = (label) => {
            const isSelected = this.state.selected.has(label.name);
            const displayName = this.callbacks.getDisplayName ? this.callbacks.getDisplayName(label.name) : label.name;
            const isNested = label.name.includes('/');

            let colorStyle = '';
            if (this.callbacks.getLabelColor) {
                const colors = this.callbacks.getLabelColor(label.id);
                if (colors.backgroundColor) {
                    // Style: Text color + Border color (Subtle Tint)
                    const textColor = (colors.textColor === '#ffffff' || colors.textColor === '#fff') ? colors.backgroundColor : colors.textColor;
                    colorStyle = `style="color: ${textColor}; border-color: ${colors.backgroundColor};"`;
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

        const visibleLabels = this.state.allLabels.filter(label => {
            if (this.callbacks.isHidden && this.callbacks.isHidden(label.name)) return false;
            if (!filter) return true;
            const dName = this.callbacks.getDisplayName ? this.callbacks.getDisplayName(label.name) : label.name;
            return dName.toLowerCase().includes(filter);
        });

        visibleLabels.forEach(label => {
            let groupId = 'ungrouped';
            if (this.callbacks.getGroupId) {
                groupId = this.callbacks.getGroupId(label.id) || 'ungrouped';
            }
            if (!groupContent[groupId]) groupContent[groupId] = [];
            groupContent[groupId].push(label);
        });

        const groupOrder = ['system', ...Object.keys(groups).filter(k => k !== 'system'), 'ungrouped'];
        let html = '';

        groupOrder.forEach(groupId => {
            const labels = groupContent[groupId] || [];
            if (labels.length === 0) return;

            const sortedLabels = this.callbacks.sortLabels ? this.callbacks.sortLabels(labels, groupId) : labels;

            let headerHtml = '';
            let groupClass = 'label-group';
            // Check collapsed state
            if (this.state.groupCollapsed[groupId]) {
                groupClass += ' collapsed';
            }

            if (groupId !== 'ungrouped') {
                const rawName = groups[groupId]?.name || groupId;

                headerHtml = `
               <div class="group-header" data-group-id="${groupId}">
                 <span class="group-toggle">▼</span>
                 <span class="group-name">${this.escapeHtml(rawName)}</span>
                 <span class="group-count">${labels.length}</span>
               </div>
             `;
            }

            const labelsHtml = sortedLabels.map(generateLabelHtml).join('');

            html += `
          <div class="${groupClass}" data-group-id="${groupId}">
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
                this.renderLabelList();
            });

            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('application/x-gmail-mlp-label-id', item.dataset.id);
                e.dataTransfer.setData('application/x-gmail-mlp-label-name', item.dataset.name);
            });
        });

        // Re-bind Group Header click events
        $labelList.querySelectorAll('.group-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const groupId = header.dataset.groupId;
                // Toggle state
                this.state.groupCollapsed[groupId] = !this.state.groupCollapsed[groupId];

                // Toggle DOM class for immediate feedback
                const groupContainer = header.closest('.label-group');
                groupContainer.classList.toggle('collapsed');

                e.preventDefault();
                e.stopPropagation();
            });
        });
    }

    bindEvents() {
        const $filterInput = this.shadow.getElementById('filterInput');
        const $modeSwitch = this.shadow.getElementById('modeSwitch');
        const $clearBtn = this.shadow.getElementById('clearBtn');
        const $searchBtn = this.shadow.getElementById('searchBtn');
        const $dragHandle = this.shadow.getElementById('dragHandle');
        const $morphWrapper = this.shadow.getElementById('morphWrapper');
        const $collapseBtn = this.shadow.getElementById('collapseBtn');

        // Filter
        $filterInput.addEventListener('input', (e) => {
            this.state.filterText = e.target.value;
            this.renderLabelList();
        });

        // Mode Switch
        $modeSwitch.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.state.mode = btn.dataset.val;

                // Update UI
                $modeSwitch.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (this.state.mode === 'OR') {
                    $modeSwitch.classList.add('mode-or');
                } else {
                    $modeSwitch.classList.remove('mode-or');
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

        // Collapse Toggle Logic
        const togglePanel = () => {
            this.state.panelCollapsed = !this.state.panelCollapsed;
            this.updateCollapseState();
            this.callbacks.onCollapseChange(this.state.panelCollapsed);
        };

        // Click wrapper when collapsed -> Expand
        $morphWrapper.addEventListener('click', (e) => {
            if (this.state.panelCollapsed) {
                togglePanel();
                e.stopPropagation();
            }
        });

        // Collapse Button Click
        if ($collapseBtn) {
            $collapseBtn.addEventListener('click', (e) => {
                togglePanel();
                e.stopPropagation();
            });
        }

        // Drag Handler
        const attachDrag = (target) => {
            let isDragging = false;
            let isRealDrag = false;
            let dragStartX, dragStartY;
            let startLeft, startBottom;

            target.addEventListener('mousedown', (e) => {
                // If expanded, only drag via handle (target must be handle)
                if (!this.state.panelCollapsed && target !== $dragHandle) return;

                isDragging = true;
                isRealDrag = false;
                dragStartX = e.clientX;
                dragStartY = e.clientY;

                // Capture current style relative to viewport
                const rect = this.host.getBoundingClientRect();
                const winH = window.innerHeight;

                // We use LEFT and BOTTOM now
                startLeft = rect.left;
                startBottom = winH - rect.bottom;

                target.classList.add('dragging');
                e.preventDefault();
                e.stopPropagation();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const deltaX = e.clientX - dragStartX;
                const deltaY = dragStartY - e.clientY; // Drag up -> Increase bottom

                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                if (!isRealDrag && distance > 5) {
                    isRealDrag = true;
                }

                if (isRealDrag) {
                    const newLeft = startLeft + deltaX;
                    let newBottom = startBottom + deltaY;

                    // Real-time Constraint: Prevent dragging off-top
                    const hostHeight = this.host.offsetHeight;
                    const maxBottom = window.innerHeight - hostHeight - 10;

                    if (newBottom > maxBottom) newBottom = maxBottom;
                    if (newBottom < 10) newBottom = 10; // Prevent dragging off-bottom too

                    this.host.style.left = `${newLeft}px`;
                    this.host.style.bottom = `${newBottom}px`;
                }
            });

            document.addEventListener('mouseup', (e) => {
                if (!isDragging) return;
                target.classList.remove('dragging');

                if (isRealDrag) {
                    this.callbacks.onSnap(this.host);
                }

                isDragging = false;
                isRealDrag = false;
            });
        };

        attachDrag($dragHandle); // Drag when expanded
        attachDrag($morphWrapper); // Drag when collapsed (FAB)
    }

    updateCollapseState() {
        const $morphWrapper = this.shadow.getElementById('morphWrapper');
        if (!this.host || !$morphWrapper) return;

        if (this.state.panelCollapsed) {
            $morphWrapper.classList.add('collapsed');
        } else {
            $morphWrapper.classList.remove('collapsed');
        }
    }

    updatePosition() {
        if (this.state.panelPosition) {
            // Use x/y as left/bottom
            const x = this.state.panelPosition.x !== undefined ? this.state.panelPosition.x :
                (this.state.panelPosition.right ? window.innerWidth - this.state.panelPosition.right - 300 : 20); // Fallback
            const y = this.state.panelPosition.y !== undefined ? this.state.panelPosition.y : (this.state.panelPosition.bottom || 20);

            this.host.style.left = `${x}px`;
            this.host.style.bottom = `${y}px`;
        }
    }

    showToast(message, type = 'success') {
        if (!this.shadow) return;

        const toast = document.createElement('div');
        toast.className = `mlp-toast mlp-toast-${type}`;
        toast.textContent = message;

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
