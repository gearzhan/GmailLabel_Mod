// Popup Script - 扩展弹出窗口逻辑

document.addEventListener('DOMContentLoaded', () => {
  // 打开 Gmail
  document.getElementById('openGmailBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://mail.google.com' });
  });

  // 打开设置页面
  document.getElementById('openOptionsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
