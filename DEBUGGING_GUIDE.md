# Gmail Label Extension Debugging Guide

## Current Issue: Extension Not Picking Up Gmail Labels

The extension has been updated with comprehensive debug logging to help identify why labels are not being detected.

## 🔧 最新改进 (Latest Improvements)

本扩展已进行以下关键改进来解决标签检测问题：

### 1. 脚本执行时机优化
- ✅ 将内容脚本执行时机从 `document_start` 改为 `document_idle`
- ✅ 确保Gmail界面完全加载后再执行脚本
- ✅ 添加Gmail侧边栏专门的等待逻辑

### 2. Gmail侧边栏智能检测
- ✅ 新增 `waitForGmailSidebar()` 函数，支持多种选择器
- ✅ 智能等待Gmail侧边栏加载完成
- ✅ 自动重试机制，提高检测成功率

### 3. DOM基础标签检测
- ✅ 实现 `extractLabelsFromSidebar()` 函数
- ✅ 直接从DOM中提取标签信息
- ✅ 过滤系统标签，只保留用户标签
- ✅ 支持多种标签元素选择器

### 4. 增强的调试和测试
- ✅ 添加详细的调试日志和错误处理
- ✅ 创建 `debug.html` 测试页面
- ✅ 实现ping/pong通信测试
- ✅ 新增 `test-improvements.js` 综合测试脚本

### 5. 改进的DOM观察和通信
- ✅ 使用MutationObserver监听侧边栏变化
- ✅ 防抖机制避免频繁触发
- ✅ 更精确的DOM变化检测
- ✅ 改进的后台脚本消息处理

### 6. 邮件场景检测
- ✅ 新增邮件列表和内容观察器
- ✅ 检测回复邮件场景
- ✅ 改进的标签应用逻辑

## Steps to Debug

### 1. Enable Debug Mode
✅ **Already Done**: Debug mode has been enabled in `src/shared/constants.js`

### 2. Reload the Extension
1. Open Chrome and go to `chrome://extensions/`
2. Find "Gmail Label Modifier" extension
3. Click the refresh/reload button
4. Make sure the extension is enabled

### 3. Run Improved Testing

In Gmail page console, run the test script:
```javascript
// Copy and paste test-improvements.js content to console
// Or directly run the following command to load test script
fetch('/test-improvements.js').then(r => r.text()).then(eval);
```

### 4. Open Gmail and Check Console
1. Open Gmail in a new tab
2. Open Chrome DevTools (F12 or right-click → Inspect)
3. Go to the Console tab
4. Look for debug messages starting with `[Gmail Label Manager]`

### 4. Expected Debug Messages

When the extension is working correctly, you should see:

```
[Gmail Label Manager] Initializing content script
[Gmail Label Manager] Initializing Gmail interceptor
[Gmail Label Manager] Gmail interceptor initialized
[Gmail Label Manager] Initializing DOM observer
```

When Gmail makes API requests, you should see:
```
[Gmail Label Manager] Fetch request intercepted: [URL]
[Gmail Label Manager] Gmail request detected: [URL]
[Gmail Label Manager] Gmail API request confirmed: [URL]
[Gmail Label Manager] Processing response data for URL: [URL]
```

When labels are found:
```
[Gmail Label Manager] Extracting labels from data: [data]
[Gmail Label Manager] Found label: {labelId: "...", labelName: "..."}
[Gmail Label Manager] Cached label and notifying background: {labelId: "...", labelName: "..."}
```

### 5. Test the Extension

Use the debug tool:
1. Open `debug.html` in Chrome
2. Click "Check Extension Status"
3. Click "Check Storage" to see if any labels are cached

### 6. Common Issues and Solutions

#### Issue: No debug messages appear
**Solution**: 
- Extension may not be loaded properly
- Reload the extension
- Check if content script is injected

#### Issue: "Gmail interceptor not found on window object"
**Solution**:
- Script loading order issue
- Check manifest.json content_scripts order

#### Issue: Gmail requests detected but no API requests confirmed
**Solution**:
- Gmail may be using different API endpoints
- Check the actual URLs being requested

#### Issue: API requests confirmed but no labels extracted
**Solution**:
- Gmail response format may have changed
- Check the response data structure

### 7. Manual Testing Steps

1. **Navigate to Gmail**: Go to https://mail.google.com
2. **Check Console**: Look for initialization messages
3. **Browse Emails**: Click on different emails with labels
4. **Check Labels Tab**: Go to Gmail settings → Labels
5. **Apply/Remove Labels**: Try applying or removing labels from emails
6. **Check Storage**: Use debug.html to check if labels are being cached

### 8. Advanced Debugging

If basic debugging doesn't reveal the issue:

1. **Check Network Tab**: 
   - Open DevTools → Network tab
   - Filter by "XHR" or "Fetch"
   - Look for Gmail API requests

2. **Check Response Data**:
   - Click on Gmail API requests in Network tab
   - Check Response tab to see data structure

3. **Test Different Gmail Views**:
   - Try different Gmail interfaces (new/old)
   - Test with different email accounts
   - Try different browsers

### 9. Reporting Issues

If the extension still doesn't work, provide:

1. **Console Logs**: Copy all debug messages from console
2. **Network Requests**: Screenshot of Gmail API requests in Network tab
3. **Extension Status**: Results from debug.html
4. **Gmail Version**: Note which Gmail interface you're using
5. **Browser Info**: Chrome version and OS

### 10. Quick Fixes to Try

1. **Clear Extension Storage**:
   ```javascript
   // Run in console on any page
   chrome.storage.local.clear();
   ```

2. **Manually Trigger Label Detection**:
   ```javascript
   // Run in Gmail console
   if (window.gmailInterceptor) {
     console.log('Interceptor found:', window.gmailInterceptor);
     console.log('Cache stats:', window.gmailInterceptor.getCacheStats());
   }
   ```

3. **Check if Scripts are Loaded**:
   ```javascript
   // Run in Gmail console
   console.log('Gmail Interceptor:', typeof window.gmailInterceptor);
   console.log('DOM Observer:', typeof window.domObserver);
   console.log('Content Script:', typeof window.contentScript);
   ```

## 🔧 常见问题排查

### 1. Service Worker注册失败 (状态码15)
**问题**: Service Worker registration failed. Status code: 15

**原因**: 
- importScripts路径不正确
- 导入的文件包含浏览器特定API（如window、document）
- 文件语法错误

**解决方案**:
1. 检查background.js中的importScripts路径是否正确
2. 确保导入的文件不包含DOM API调用
3. 使用专门的Service Worker工具文件（utils-sw.js）
4. 在Chrome扩展管理页面查看详细错误信息

### 2. 扩展无法加载
- 检查manifest.json语法是否正确
- 确认所有文件路径存在
- 查看Chrome扩展管理页面的错误信息

## Next Steps

After following this guide:
1. Try the extension with debug logging enabled
2. Check what debug messages appear (or don't appear)
3. Report back with the specific console output
4. We can then target the specific issue based on where the process is failing