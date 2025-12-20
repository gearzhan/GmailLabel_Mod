// GmailAdapter.js - Handles Gmail DOM interactions

class GmailAdapter {
    constructor() {
        this.checkInterval = null;
    }

    // 等待 Gmail 加载完成
    waitForGmailReady() {
        return new Promise((resolve) => {
            this.checkInterval = setInterval(() => {
                // 检查 Gmail 主区域是否已加载
                const mainArea = document.querySelector('div[role="main"]') ||
                    document.querySelector('[data-app="Gmail"]');

                if (mainArea) {
                    clearInterval(this.checkInterval);
                    resolve();
                }
            }, 800);

            // 30秒超时
            setTimeout(() => {
                if (this.checkInterval) clearInterval(this.checkInterval);
                resolve();
            }, 30000);
        });
    }

    /**
     * Multi-layered Message ID extraction strategy
     * @param {HTMLElement} row - The table row element (tr or div)
     * @returns {string|null} - The Hex Message ID or null
     */
    getMessageIdFromRow(row) {
        if (!row) return null;

        let foundId = null;

        // Helper: Convert Decimal ID (found in jslog) to Hex (required by API)
        const normalizeId = (id) => {
            if (!id) return null;
            // If the ID is all digits (Decimal), convert to Hex
            if (/^\d+$/.test(id)) {
                try {
                    return BigInt(id).toString(16);
                } catch (e) {
                    console.warn('[MLP] Failed to convert ID to hex:', id);
                    return id;
                }
            }
            return id; // Already Hex or other format
        };

        // Helper: Safe Base64 Decode
        const safeAtob = (str) => {
            try {
                // Fix padding if needed
                const missingPadding = str.length % 4;
                if (missingPadding) {
                    str += '='.repeat(4 - missingPadding);
                }
                // Replace URL safe chars if present (though usually Gmail uses standard base64 in jslog)
                str = str.replace(/-/g, '+').replace(/_/g, '/');
                return atob(str);
            } catch (e) {
                console.warn('[MLP] Base64 decode failed:', e);
                return null;
            }
        };

        // Strategy 0: Parse 'jslog' attribute (MOST RELIABLE for modern Gmail)
        // The jslog contains base64-encoded JSON with decimal message IDs
        const jslog = row.getAttribute('jslog');
        if (jslog) {
            try {
                // 1. Extract the Base64 part (usually after "1:")
                // Format: "18406; u014N:xr6bB,SYhH9d; 1:BASE64_DATA; 4:W10."
                const match = jslog.match(/1:([^;"]+)/);
                if (match && match[1]) {
                    // 2. Clean Base64 string (remove trailing non-base64 characters)
                    // Valid base64: A-Z, a-z, 0-9, +, /, =
                    // Gmail sometimes appends trailing periods ('.', '..') which break atob()
                    const cleanedBase64 = match[1].replace(/[^A-Za-z0-9+/=]/g, '');

                    // 3. Decode Base64 safely
                    const decoded = safeAtob(cleanedBase64);

                    if (decoded) {
                        // 4. Parse JSON array
                        // First element contains: "#thread-f:THREAD_ID|msg-f:MESSAGE_ID"
                        const dataArray = JSON.parse(decoded);
                        if (dataArray && dataArray[0]) {
                            // 5. Extract message ID using regex (finds "msg-f:12345...")
                            const idMatch = dataArray[0].match(/(?:msg|thread)-f:(\d+)/);
                            if (idMatch && idMatch[1]) {
                                foundId = idMatch[1];
                                // console.log('[MLP] ID found via jslog (decimal):', foundId);
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn('[MLP] Error parsing jslog:', e);
            }
        }

        // Strategy 1: Checkbox Input (Standard View)
        if (!foundId) {
            const checkbox = row.querySelector('input[name="t"]');
            if (checkbox) {
                foundId = checkbox.getAttribute('data-message-id') ||
                    checkbox.getAttribute('data-legacy-message-id') ||
                    checkbox.value;
            }
        }

        // Strategy 2: Data attributes on row
        if (!foundId) {
            foundId = row.getAttribute('data-message-id') ||
                row.getAttribute('data-legacy-message-id');
        }

        // Strategy 3: Row ID (e.g. "msg-12345")
        if (!foundId && row.id && row.id.startsWith('msg-')) {
            foundId = row.id.replace('msg-', '');
        }

        // Strategy 4: Link Href parsing
        if (!foundId) {
            const link = row.querySelector('a[href*="/mail/"]');
            if (link) {
                const hrefMatch = link.href.match(/\/mail\/.*#.*\/([a-f0-9]+)/);
                if (hrefMatch) foundId = hrefMatch[1];
            }
        }

        // Strategy 5: Fallback to URL (Thread View only)
        // If we are dragging onto a row in the thread view, it might be the only message there.
        // CAUTION: This is risky if user is multi-selecting, but safe for single DnD if we assume 
        // the user is acting on the currently viewed context if all else fails.
        if (!foundId) {
            // Check if URL looks like /mail/u/0/#inbox/MESSAGE_ID
            const hash = window.location.hash; // #inbox/192...
            const urlMatch = hash.match(/\/([a-f0-9]{16})$/);
            if (urlMatch) {
                console.log('[MLP] ID extraction fallback to URL hash:', urlMatch[1]);
                foundId = urlMatch[1];
            }
        }

        // Clean up: Ignore placeholder values like '#'
        if (foundId && foundId.startsWith('#')) {
            foundId = null;
        }

        // Normalize: Convert decimal to hex if needed
        const finalId = normalizeId(foundId);

        if (!finalId) {
            console.warn('[MLP] Could not extract Message ID from row. HTML:', row.outerHTML.substring(0, 150) + '...');
        }

        return finalId;
    }

    /**
     * 从 URL hash 提取当前查看的邮件 ID (用于 SplitPane 阅读窗格)
     * @returns {string|null} - Hex Message ID 或 null
     */
    getMessageIdFromUrl() {
        const hash = window.location.hash;
        console.log('[MLP] Extracting message ID from URL hash:', hash);

        // Helper: Convert Decimal ID to Hex (required by API)
        const normalizeId = (id) => {
            if (!id) return null;
            // If the ID is all digits (Decimal), convert to Hex
            if (/^\d+$/.test(id)) {
                try {
                    return BigInt(id).toString(16);
                } catch (e) {
                    console.warn('[MLP] Failed to convert ID to hex:', id);
                    return id;
                }
            }
            return id; // Already Hex or other format
        };

        // 策略1: 十六进制格式 #inbox/HEX_ID 或 #label/XYZ/HEX_ID
        let match = hash.match(/\/([a-f0-9]{16,})$/i);
        if (match) {
            console.log('[MLP] Found hex message ID in URL:', match[1]);
            return match[1];
        }

        // 策略2: 十进制格式 #inbox/DECIMAL_ID (Gmail有时使用)
        match = hash.match(/\/(\d{18,})$/);
        if (match) {
            console.log('[MLP] Found decimal message ID in URL:', match[1]);
            return normalizeId(match[1]);
        }

        // 策略3: 混合格式 (可能包含其他字符)
        // 例如: #inbox/FMfcgz...
        match = hash.match(/\/([A-Za-z0-9_-]{20,})$/);
        if (match) {
            console.log('[MLP] Found mixed format ID in URL:', match[1]);
            return match[1];
        }

        console.log('[MLP] Could not extract message ID from URL');
        return null;
    }

    // 边缘吸附函数
    snapToEdge(host, updateCallback) {
        const rect = host.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        const centerX = rect.left + rect.width / 2;
        // Calculate current Bottom offset
        const currentBottom = windowHeight - rect.bottom;

        let finalLeft;
        // Snap logic: Check if closer to Left or Right edge
        if (centerX < windowWidth / 2) {
            // Snap to Left
            finalLeft = 12;
        } else {
            // Snap to Right
            // Left = WindowWidth - Width - Padding
            finalLeft = windowWidth - rect.width - 12;
        }

        // Y-Axis: Constrain within screen
        // Top edge constraint: Bottom + Height cannot exceed WindowHeight - Padding
        // So FinalBottom <= WindowHeight - Height - Padding
        const topPadding = 20;
        const maxBottom = windowHeight - rect.height - topPadding;

        let finalBottom = Math.max(16, Math.min(currentBottom, maxBottom));

        // Apply transition and new pos
        host.style.transition = 'left 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), bottom 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
        host.style.right = 'auto'; // Reset right
        host.style.left = `${finalLeft}px`;
        host.style.bottom = `${finalBottom}px`;

        // Clear transition
        setTimeout(() => {
            host.style.transition = '';
        }, 300);

        // Callback with x/y structure (standard for Left positioning)
        if (updateCallback) updateCallback({ x: finalLeft, y: finalBottom });
    }
}
