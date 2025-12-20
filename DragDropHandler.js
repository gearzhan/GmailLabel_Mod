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
        // 仅接受我们的自定义拖拽类型
        if (!e.dataTransfer.types.includes('application/x-gmail-mlp-label-id')) {
            return;
        }

        // 查找有效的 drop target
        let dropTarget = null;

        // 策略1: 邮件列表行 (原有逻辑)
        dropTarget = e.target.closest('tr[role="row"], div[role="row"]');

        // 策略2: SplitPane 阅读窗格 - 查找带有 message ID 的元素
        if (!dropTarget) {
            dropTarget = e.target.closest('[data-legacy-message-id], [data-message-id]');
        }

        // 策略3: 回退到 main 区域 (当 URL 包含 message ID 时)
        if (!dropTarget) {
            const hash = window.location.hash;
            // 匹配: #inbox/HEX_MESSAGE_ID 或 #label/XYZ/HEX_MESSAGE_ID
            if (hash.match(/\/[a-f0-9]{16,}$/i)) {
                dropTarget = e.target.closest('div[role="main"]');
            }
        }

        // 更新高亮状态
        if (dropTarget && dropTarget !== this.dragOverRow) {
            if (this.dragOverRow) {
                this.dragOverRow.classList.remove('mlp-drag-over');
            }
            this.dragOverRow = dropTarget;
            this.dragOverRow.classList.add('mlp-drag-over');
        }

        if (dropTarget) {
            e.preventDefault(); // 允许 drop
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

        console.log('[MLP] Drop target element:', this.dragOverRow.tagName, this.dragOverRow.className);

        // Extract Message ID using multiple strategies
        let messageId = null;

        // 策略1: 从 row 元素提取 (列表视图)
        messageId = this.gmailAdapter.getMessageIdFromRow(this.dragOverRow);
        if (messageId) {
            console.log('[MLP] Message ID from row:', messageId);
        }

        // 策略2: 从 drop target 的 data 属性直接提取 (阅读窗格元素)
        if (!messageId) {
            const legacyId = this.dragOverRow.getAttribute('data-legacy-message-id');
            const dataId = this.dragOverRow.getAttribute('data-message-id');
            messageId = legacyId || dataId;
            if (messageId) {
                console.log('[MLP] Message ID from data attribute:', messageId);
            }
        }

        // 策略3: 从 URL 提取 (阅读窗格/详情视图)
        if (!messageId) {
            messageId = this.gmailAdapter.getMessageIdFromUrl();
            if (messageId) {
                console.log('[MLP] Message ID from URL:', messageId);
            }
        }

        // Remove highlight
        this.dragOverRow.classList.remove('mlp-drag-over');
        this.dragOverRow = null;

        if (!messageId) {
            console.error('[MLP] All message ID extraction strategies failed');
            this.showToast('Could not identify message ID', 'error');
            return;
        }

        console.log(`[MLP] Applying label "${labelName}" to message ${messageId}`);

        // 乐观UI：立即显示成功提示，不等待API响应
        this.showToast(`Label "${labelName}" applied`, 'success');

        // 后台发送API请求
        chrome.runtime.sendMessage({
            type: 'APPLY_LABEL',
            accountKey: this.getAccountKey(),
            messageId: messageId,
            labelId: labelId
        }, (response) => {
            // 乐观UI：只有在API失败时才显示错误提示
            if (!response) {
                console.error('[MLP] No response from background');
                this.showToast(`Failed to apply "${labelName}": No response from background`, 'error');
                return;
            }

            if (!response.ok) {
                console.error('[MLP] Apply label failed:', response.error);
                this.showToast(`Failed to apply "${labelName}": ${response.error}`, 'error');
            } else {
                // 成功时不需要再次显示提示（乐观UI已经显示过了）
                console.log('[MLP] Label applied successfully');
                // 触发 Gmail 刷新以显示新标签
                this.triggerGmailRefresh();
            }
        });
    }

    // 触发 Gmail UI 刷新以显示新应用的标签
    triggerGmailRefresh() {
        // 使用 hash 变化触发 Gmail 内部刷新
        const currentHash = window.location.hash;
        // 添加临时查询参数触发刷新
        window.location.hash = currentHash + '?mlp_refresh=' + Date.now();
        // 短暂延迟后恢复原始 hash
        setTimeout(() => {
            window.location.hash = currentHash;
        }, 50);
    }

    // Helper to show toast via CustomEvent (since Toast is in Shadow DOM)
    showToast(message, type) {
        // Dispatch event to be caught by PanelUI or main script
        window.dispatchEvent(new CustomEvent('mlp-toast', {
            detail: { message, type }
        }));
    }
}
