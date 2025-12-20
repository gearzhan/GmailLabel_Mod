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
      bottom: 20px;
      left: 20px; /* Restore Left */
      right: auto; 
      font-family: 'Google Sans', Roboto, RobotoDraft, Helvetica, Arial, sans-serif;
      --md-sys-color-primary: #0b57d0;
      --md-sys-color-on-primary: #ffffff;
      --md-sys-color-primary-container: #d3e3fd;
      --md-sys-color-on-primary-container: #041e49;
      --md-sys-color-surface: #ffffff;
      --md-sys-color-surface-container: #f0f4f9;
      --md-sys-color-surface-container-high: #e9eef6;
      --md-sys-color-on-surface: #1f1f1f;
      --md-sys-color-on-surface-variant: #444746;
      --md-sys-color-outline-variant: #c4c7c5;
      --md-elevation-3: 0 4px 8px 3px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.3);
      --md-sys-shape-corner-medium: 16px;
      --md-sys-shape-corner-small: 8px;
      
      /* New Fab & Anim Vars */
      /* USER REQUEST: Smaller FAB */
      --fab-size: 40px; 
      --panel-width: 320px;
      --panel-height: 500px;
    }

    /* Morph Wrapper to handle the transition */
    .morph-wrapper {
      position: relative;
      width: var(--panel-width);
      height: var(--panel-height);
      transition: all 0.4s cubic-bezier(0.2, 0, 0, 1);
      transform-origin: bottom left; /* Origin Bottom Left for Left Positioning */
      display: flex;
      flex-direction: column;
      pointer-events: none; /* Let clicks pass through when collapsed/hidden */
    }

    /* Collapsed state (FAB mode) */
    .morph-wrapper.collapsed {
      width: var(--fab-size);
      height: var(--fab-size);
      border-radius: 50%;
      box-shadow: var(--md-elevation-3);
      cursor: pointer;
      pointer-events: auto;
      overflow: hidden;
      background: var(--md-sys-color-primary-container);
    }
    
    .morph-wrapper.collapsed:hover {
       filter: brightness(0.95);
       transform: scale(1.05);
    }

    /* Inner Card Structure */
    .card {
      background: var(--md-sys-color-surface);
      border-radius: var(--md-sys-shape-corner-medium);
      box-shadow: var(--md-elevation-3);
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid var(--md-sys-color-outline-variant);
      pointer-events: auto;
      opacity: 1;
      transition: opacity 0.3s ease;
    }

    .morph-wrapper.collapsed .card {
      opacity: 0;
      pointer-events: none;
    }

    /* FAB Icon (Visible only when collapsed) */
    .fab-icon {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--md-sys-color-on-primary-container);
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: none;
      z-index: 2;
    }
    
    /* Make icon smaller since FAB is smaller */
    .fab-icon svg {
        width: 20px;
        height: 20px;
    }

    .morph-wrapper.collapsed .fab-icon {
      opacity: 1;
    }

    /* Header / Drag Handle Area */
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between; /* Space between handle and close btn */
      padding: 0 8px;
      height: 32px; /* Slightly taller for better touch targets */
      background: var(--md-sys-color-surface);
      flex-shrink: 0;
      border-bottom: 1px solid transparent; 
    }

    /* Drag Handle (Center part) */
    .drag-handle {
        flex: 1;
        height: 100%;
        cursor: grab;
        display: flex;
        justify-content: center;
        align-items: center;
        /* Make sure it doesn't overlap the button too much if title added */
    }
    .drag-handle-bar {
        width: 32px;
        height: 4px;
        background: var(--md-sys-color-outline-variant);
        border-radius: 2px;
    }
    .drag-handle:active {
        cursor: grabbing;
    }
    
    /* Header Controls (Close Button) - REDESIGNED */
    .header-controls {
      display: flex;
      align-items: center;
    }
    
    .btn-icon-sm {
      width: 28px;
      height: 28px;
      padding: 0;
      border: none;
      background: var(--md-sys-color-surface-container-high); /* Distinct background */
      border-radius: 50%;
      color: var(--md-sys-color-on-surface-variant);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      margin-left: 4px; /* Space from handle if needed */
    }
    .btn-icon-sm:hover {
      background: var(--md-sys-color-outline-variant);
      color: var(--md-sys-color-on-surface);
      transform: scale(1.05);
    }
    .btn-icon-sm svg {
        width: 18px;
        height: 18px;
    }



    .panel-content {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    /* --- List Area --- */
    .label-list {
      flex: 1;
      overflow-y: auto;
      padding: 0 8px 8px 8px; /* Breathing room */
    }
    .label-list::-webkit-scrollbar { width: 6px; }
    .label-list::-webkit-scrollbar-track { background: transparent; }
    .label-list::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }

    /* --- Label Groups --- */
    .label-group { margin-bottom: 8px; }
    
    .group-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      margin-bottom: 4px;
      cursor: pointer;
      user-select: none;
      border-radius: 4px;
      color: var(--md-sys-color-on-surface-variant);
      transition: background 0.2s;
    }
    .group-header:hover { background: var(--md-sys-color-surface-container); }
    
    .group-name {
      font-size: 11px;
      font-weight: 600;
      text-transform: capitalize; /* Ensure Title Case */
      letter-spacing: 0.5px;
      flex: 1;
    }
    .group-toggle { font-size: 10px; transition: transform 0.2s; }
    .group-count { font-size: 10px; opacity: 0.7; }
    
    /* Collapsed group state logic (handled by JS toggling class on .label-group or sibling) 
       We will toggle a 'collapsed' class on the .label-group container.
    */
    .label-group.collapsed .group-labels { display: none; }
    .label-group.collapsed .group-toggle { transform: rotate(-90deg); }


    .group-labels {
      display: flex;
      flex-wrap: wrap;
      gap: 4px; /* Slightly more gap */
      padding-left: 8px;
    }

    /* --- Labels (Subtle Tint) --- */
    .label-item {
      padding: 4px 10px;
      border-radius: 8px; /* Soft rect/pill hybrid */
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      user-select: none;
      transition: all 0.2s ease;
      background-color: var(--md-sys-color-surface-container);
      color: var(--md-sys-color-on-surface);
      border: 1px solid transparent;
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      /* Default backup colors handled in JS, but base style here */
    }

    .label-item:hover {
      transform: scale(1.02);
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      filter: brightness(0.97);
    }

    .label-item.selected {
      /* Stronger indication for selected */
      background-color: #d3e3fd !important; /* Explicit Highlight Blue */
      color: #041e49 !important; /* Dark Blue Text */
      font-weight: 600;
      box-shadow: 0 1px 2px rgba(0,0,0,0.15);
      border: 1px solid #0b57d0; /* Add Blue Border */
    }

    /* Nested markers */
    .label-item.nested-label {
      position: relative;
    }
    .label-item.nested-label::before {
      content: '↳';
      font-size: 10px;
      margin-right: 4px;
      opacity: 0.5;
    }

    /* --- Consolidated Footer --- */
    .footer {
      padding: 12px;
      background: var(--md-sys-color-surface);
      border-top: 1px solid var(--md-sys-color-surface-container-high);
      display: grid;
      grid-template-columns: 1fr auto;
      grid-template-rows: auto auto;
      gap: 8px;
      flex-shrink: 0;
    }

    /* Row 1: Filter (Full width) */
    .search-row {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      background: var(--md-sys-color-surface-container);
      border-radius: 20px;
      padding: 0 12px;
      height: 36px;
    }
    .filter-icon { color: var(--md-sys-color-on-surface-variant); margin-right: 8px; }
    .filter-input {
      border: none;
      background: transparent;
      outline: none;
      width: 100%;
      font-size: 13px;
      color: var(--md-sys-color-on-surface);
    }

    /* Row 2: Controls */
    .controls-row {
      grid-column: 1 / -1;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .left-controls {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .right-controls {
        display: flex;
        gap: 8px;
    }

    /* Mode Switch (Compact) */
    .mode-switch {
      display: flex;
      background: var(--md-sys-color-surface-container-high);
      border-radius: 8px;
      padding: 2px;
      height: 28px;
      position: relative;
      width: 80px;
    }
    .toggle-pill {
      position: absolute;
      top: 2px; bottom: 2px;
      left: 2px; width: calc(50% - 2px);
      background: white; border-radius: 6px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      transition: transform 0.2s;
    }
    .mode-switch.mode-or .toggle-pill { transform: translateX(100%); }
    
    .mode-btn {
      flex: 1; z-index: 1;
      border: none; background: transparent;
      font-size: 10px; font-weight: 700;
      color: var(--md-sys-color-on-surface-variant);
      cursor: pointer;
    }
    .mode-btn.active { color: var(--md-sys-color-primary); }

    /* Action Buttons */
    .btn-icon {
        background: transparent;
        border: none;
        color: var(--md-sys-color-on-surface-variant);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
    }
    .btn-icon:hover { background: var(--md-sys-color-surface-container-high); color: var(--md-sys-color-primary); }

    .btn-primary {
        background: var(--md-sys-color-primary);
        color: var(--md-sys-color-on-primary);
        border: none;
        padding: 0 16px;
        height: 28px;
        border-radius: 14px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .btn-primary:hover { background: #0b4ebf; box-shadow: 0 1px 2px rgba(0,0,0,0.2); }

    /* States */
    .empty-state, .loading { padding: 32px; text-align: center; font-size: 12px; color: #888; }
    .error { margin: 8px; padding: 8px; background: #fce8e6; color: #c5221f; border-radius: 8px; font-size: 12px; }

    /* Toast */
    .mlp-toast {
      position: fixed;
      bottom: 80px; 
      right: auto; 
      left: 20px; /* Toast also left aligned matching FAB */
      background: #323232;
      color: #f2f2f2;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 13px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s;
      pointer-events: none;
    }
    .mlp-toast-show { opacity: 1; transform: translateY(0); }
    .mlp-toast-success { border-left: 4px solid #81c995; }
    .mlp-toast-error { border-left: 4px solid #f28b82; }

    /* Custom Scrollbar just in case */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }

`;
