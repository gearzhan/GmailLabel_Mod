// styles.js - Externalized CSS for GLabel Mod

const MLP_STYLES = `
    * {
      box-sizing: border-box;
    }
    button, input, select {
      font-family: inherit;
    }
    :host {
      all: initial;
      z-index: 9999;
      position: fixed;
      bottom: 16px;
      left: 12px;
      font-family: 'Google Sans', Roboto, RobotoDraft, Helvetica, Arial, sans-serif;
      --md-sys-color-primary: #0b57d0;
      --md-sys-color-on-primary: #ffffff;
      --md-sys-color-primary-container: #d3e3fd;
      --md-sys-color-on-primary-container: #041e49;
      --md-sys-color-secondary-container: #c2e7ff;
      --md-sys-color-on-secondary-container: #001d35;
      --md-sys-color-surface: #ffffff;
      --md-sys-color-surface-container: #f3f6fc;
      --md-sys-color-surface-container-high: #eef2f6;
      --md-sys-color-on-surface: #1f1f1f;
      --md-sys-color-on-surface-variant: #444746;
      --md-sys-color-outline: #747775;
      --md-sys-color-outline-variant: #c4c7c5;
      --md-elevation-3: 0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15);
      --md-sys-shape-corner-medium: 12px;
      --md-sys-shape-corner-small: 8px;
    }
    .card {
      background: var(--md-sys-color-surface);
      border-radius: var(--md-sys-shape-corner-medium);
      box-shadow: var(--md-elevation-3);
      padding: 0;
      width: 300px;
      height: 480px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid var(--md-sys-color-outline-variant);
      position: relative;
    }
    .panel-content {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .controls {
      padding: 8px 12px;
      background: var(--md-sys-color-surface);
      border-bottom: 1px solid var(--md-sys-color-surface-container-high);
      flex-shrink: 0;
    }
    .filter-container {
      display: flex;
      align-items: center;
      background: var(--md-sys-color-surface-container);
      border-radius: 20px;
      padding: 4px 12px;
      height: 32px;
      margin-bottom: 8px;
    }
    .filter-icon {
      color: var(--md-sys-color-on-surface-variant);
      margin-right: 8px;
    }
    .filter-input {
      border: none;
      background: transparent;
      outline: none;
      width: 100%;
      font-size: 13px;
      color: var(--md-sys-color-on-surface);
    }
    .mode-switch {
      display: flex;
      background: var(--md-sys-color-surface-container-high);
      border-radius: 8px;
      padding: 2px;
      position: relative;
      height: 24px;
    }
    .toggle-pill {
      position: absolute;
      top: 2px;
      left: 2px;
      width: calc(50% - 2px);
      height: 20px;
      background: white;
      border-radius: 6px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
      z-index: 1;
    }
    .mode-switch.mode-any .toggle-pill {
      transform: translateX(100%);
    }
    .mode-option {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 11px;
      font-weight: 500;
      color: var(--md-sys-color-on-surface-variant);
      z-index: 2;
      cursor: pointer;
      text-align: center;
      line-height: 20px;
      transition: color 0.15s;
    }
    .mode-option.active {
      color: var(--md-sys-color-primary);
    }
    .btn {
      padding: 0 16px;
      border-radius: 18px;
      border: 1px solid var(--md-sys-color-outline-variant);
      background: white;
      color: var(--md-sys-color-primary);
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      height: 26px;
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
    .btn.text-link {
      background: transparent;
      border: none;
      color: var(--md-sys-color-on-surface-variant);
      padding: 5px 8px;
      text-decoration: underline;
      text-decoration-color: transparent;
      transition: all 0.15s;
      height: auto;
    }
    .btn.text-link:hover {
      background: transparent;
      color: var(--md-sys-color-primary);
      text-decoration-color: var(--md-sys-color-primary);
    }
    .label-list {
      flex: 1;
      overflow-y: auto;
      border-top: none;
      padding-top: 0;
      margin-bottom: 0;
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
      margin-bottom: 6px;
    }
    .group-header {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 5px 7px;
      background: #f9fafb;
      border-radius: 4px;
      cursor: pointer;
      user-select: none;
      margin-bottom: 4px;
      font-weight: 500;
      font-size: 11px;
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
      gap: 2px;
      padding-left: 8px;
    }
    .label-item {
      padding: 3px 12px;
      margin: 1px 0;
      cursor: pointer;
      user-select: none;
      transition: all 0.15s cubic-bezier(0.2, 0.0, 0, 1.0);
      font-size: 11px;
      font-weight: 400;
      border-radius: 16px;
      line-height: 1.3;
      white-space: nowrap;
      border: 1px solid transparent;
      color: var(--md-sys-color-on-surface);
      background: var(--md-sys-color-surface-container);
    }
    .label-item:hover {
      background: var(--md-sys-color-surface-container-high);
      transform: translateX(2px);
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
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
    .label-item.nested-label {
      margin-left: 10px;
      border-left: 2px solid var(--md-sys-color-outline-variant);
      padding-left: 10px;
    }
    .action-bar {
      flex-shrink: 0;
      margin-top: 0;
      padding-top: 0;
      border-top: none;
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
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
      border: none;
      cursor: grab;
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
      cursor: grabbing;
      transform: scale(1.0);
    }
    .collapse-toggle.dragging {
      cursor: grabbing;
      transition: none;
    }
    .panel-collapsed {
      width: 32px;
      height: 32px;
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
    /* Toast notification styles - MD3 Snackbar */
    .mlp-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--md-sys-color-inverse-surface, #313033);
      color: var(--md-sys-color-inverse-on-surface, #f4eff4);
      padding: 12px 16px;
      border-radius: var(--md-sys-shape-corner-small);
      box-shadow: var(--md-elevation-3);
      font-size: 14px;
      font-weight: 400;
      max-width: 320px;
      z-index: 10000;
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
      pointer-events: none;
    }
    .mlp-toast-show {
      opacity: 1;
      transform: translateY(0);
    }
    .mlp-toast-success {
      background: #1e4620;
      color: #c3ebc5;
    }
    .mlp-toast-error {
      background: #601410;
      color: #f9dedc;
    }
`;
