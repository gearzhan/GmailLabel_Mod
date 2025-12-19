// DragDropHandler.js - Handles Drag and Drop logic

class DragDropHandler {
    constructor(gmailAdapter, getAccountKey) {
        this.gmailAdapter = gmailAdapter;
        this.getAccountKey = getAccountKey;
        this.dragOverRow = null;

        // Inject styles
        this.injectStyles();
    }

    injectStyles() {
        if (document.getElementById('mlp-drag-drop-styles')) return;

        const style = document.createElement('style');
        style.id = 'mlp-drag-drop-styles';
        style.textContent = `
      .mlp-drag-over {
        background-color: #e8f0fe !important;
        outline: 2px dashed #1a73e8 !important;
        outline-offset: -2px;
        transition: all 0.2s ease;
      }
    `;
        document.head.appendChild(style);
    }

    init() {
        this.bindEvents();
        console.log('[MLP] Drag-and-drop initialized');
    }

    bindEvents() {
        // Event 1: dragover - hovering over Gmail row
        document.addEventListener('dragover', (e) => this.handleDragOver(e));

        // Event 2: dragleave - drag leaving
        document.addEventListener('dragleave', (e) => this.handleDragLeave(e));

        // Event 3: drop - label dropped
        document.addEventListener('drop', (e) => this.handleDrop(e));
    }

    handleDragOver(e) {
        // Only accept our custom drag type
        if (!e.dataTransfer.types.includes('application/x-gmail-mlp-label-id')) {
            return;
        }

        // Find closest email row
        const row = e.target.closest('tr[role="row"], div[role="row"]');

        if (row && row !== this.dragOverRow) {
            if (this.dragOverRow) {
                this.dragOverRow.classList.remove('mlp-drag-over');
            }
            this.dragOverRow = row;
            this.dragOverRow.classList.add('mlp-drag-over');
        }

        if (row) {
            e.preventDefault(); // Allow drop
            e.dataTransfer.dropEffect = 'copy';
        } else if (this.dragOverRow) {
            this.dragOverRow.classList.remove('mlp-drag-over');
            this.dragOverRow = null;
        }
    }

    handleDragLeave(e) {
        if (this.dragOverRow && !this.dragOverRow.contains(e.relatedTarget)) {
            this.dragOverRow.classList.remove('mlp-drag-over');
            this.dragOverRow = null;
        }
    }

    async handleDrop(e) {
        if (!this.dragOverRow) return;

        const labelId = e.dataTransfer.getData('application/x-gmail-mlp-label-id');
        const labelName = e.dataTransfer.getData('application/x-gmail-mlp-label-name');

        if (!labelId) return;

        e.preventDefault();
        e.stopPropagation();

        // Extract Message ID using the adapter
        const messageId = this.gmailAdapter.getMessageIdFromRow(this.dragOverRow);

        // Remove highlight
        this.dragOverRow.classList.remove('mlp-drag-over');
        this.dragOverRow = null;

        if (!messageId) {
            this.showToast('Could not identify message ID', 'error');
            return;
        }

        console.log(`[MLP] Applying label "${labelName}" to message ${messageId}`);
        this.showToast(`Applying label "${labelName}"...`, 'success');

        // Send to background service
        chrome.runtime.sendMessage({
            type: 'APPLY_LABEL',
            accountKey: this.getAccountKey(),
            messageId: messageId,
            labelId: labelId
        }, (response) => {
            if (!response) {
                console.error('[MLP] No response from background');
                this.showToast('Failed to apply label: No response from background', 'error');
                return;
            }

            if (!response.ok) {
                console.error('[MLP] Apply label failed:', response.error);
                this.showToast(`Failed: ${response.error}`, 'error');
            } else {
                console.log('[MLP] Label applied successfully');
                this.showToast(`Label "${labelName}" applied successfully`, 'success');
            }
        });
    }

    // Helper to show toast via CustomEvent (since Toast is in Shadow DOM)
    showToast(message, type) {
        // Dispatch event to be caught by PanelUI or main script
        window.dispatchEvent(new CustomEvent('mlp-toast', {
            detail: { message, type }
        }));
    }
}
