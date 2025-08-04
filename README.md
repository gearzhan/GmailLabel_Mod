# Gmail Label Modifier

一个Chrome扩展，可以自动为Gmail回复邮件应用标签，并允许用户自定义标签名称和重新排序边栏中的标签。

## ✨ 核心功能

### 🏷️ 自动标签回复
- 自动将原始邮件的标签应用到回复邮件
- 智能检测回复场景
- 用户确认和通知系统
- 处理标签冲突和重复

### 🎨 自定义标签名称
- 为Gmail标签创建自定义显示名称
- Gmail界面中的实时标签名称更新
- 保留原始标签功能
- 通过选项页面轻松管理

### 📋 标签顺序管理
- 拖放重新排序Gmail边栏中的标签
- 持久化自定义标签排序
- 自动处理新标签
- 重置为默认顺序选项

### ⚙️ 高级设置
- 可配置的自动应用行为
- 通知偏好设置
- 性能优化设置
- 导入/导出设置功能

### 🔧 调试功能
- 内置调试页面 (debug.html)
- Service Worker状态检查
- 详细的错误日志和状态监控
- 开发者友好的调试工具

## Installation

### From Source (Development)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the project directory
5. The extension will be installed and ready to use

### From Chrome Web Store

*Coming soon - extension will be published to Chrome Web Store*

## Usage

### Initial Setup

1. After installation, click the extension icon in Chrome toolbar
2. Configure your preferences in the popup or options page
3. Navigate to Gmail to start using the extension

### Auto-Label Replies

1. Open Gmail and compose a reply to any labeled email
2. The extension will automatically detect the reply scenario
3. Labels from the original email will be suggested/applied
4. Confirm or modify the label application as needed

### Custom Label Names

1. Open the extension options page
2. Navigate to the "Labels" tab
3. Click "Add Custom Label" to create custom names
4. Enter the original Gmail label name and your preferred display name
5. Save and see the changes reflected in Gmail immediately

### Reorder Labels

1. In the options page "Labels" tab, find the "Label Order" section
2. Drag and drop labels to reorder them
3. Changes are saved automatically
4. The new order will be applied to Gmail's sidebar

## 📁 项目结构

```
GmailLabel_Mod/
├── manifest.json              # 扩展配置文件
├── debug.html                 # 调试页面
├── progress.md                # 开发进度记录
├── DEBUGGING_GUIDE.md         # 调试指南
├── src/
│   ├── background/            # 后台服务工作者
│   │   ├── background.js      # 主后台脚本
│   │   └── message-handler.js # 消息处理器
│   ├── content/               # Gmail内容脚本
│   │   ├── content.js         # 主内容脚本
│   │   ├── gmail-interceptor.js # Gmail API拦截器
│   │   └── dom-observer.js    # DOM观察器
│   ├── popup/                 # 扩展弹窗界面
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   ├── options/               # 选项页面
│   │   ├── options.html
│   │   ├── options.css
│   │   └── options.js
│   └── shared/                # 共享工具模块
│       ├── constants.js       # 常量定义
│       ├── utils.js           # 通用工具函数
│       ├── utils-sw.js        # Service Worker专用工具
│       └── storage.js         # 存储管理
├── assets/
│   ├── icons/                 # 扩展图标 (SVG格式)
│   │   ├── icon16.svg
│   │   ├── icon32.svg
│   │   ├── icon48.svg
│   │   └── icon128.svg
│   └── styles/                # 全局样式
└── tests/                     # 测试文件目录
```

## 🔧 技术细节

### 架构设计

- **Manifest V3**: 使用最新的Chrome扩展架构
- **Service Worker**: 后台处理API拦截和消息传递
- **Content Scripts**: Gmail DOM操作和用户交互
- **Storage API**: 持久化设置和标签数据
- **Message Passing**: 扩展组件间通信

### 核心技术

- **Gmail API拦截**: 拦截和修改Gmail的内部API调用
- **DOM观察**: 实时监控Gmail界面变化
- **数据缓存**: 高效的标签和邮件数据管理
- **拖拽排序**: 原生HTML5拖放实现标签重排
- **Service Worker兼容性**: 专用的utils-sw.js确保后台脚本稳定运行

### 性能优化

- 防抖和节流事件处理器
- 高效的DOM查询和缓存
- 最小内存占用
- 非关键组件的懒加载
- Service Worker环境优化

### 调试支持

- **调试页面**: debug.html提供实时状态监控
- **Service Worker检查**: 自动检测和报告Service Worker状态
- **详细日志**: 完整的错误追踪和性能监控
- **开发者工具**: 便于开发和故障排除的工具集

## Development

### Prerequisites

- Chrome browser (latest version recommended)
- Basic knowledge of JavaScript, HTML, and CSS
- Understanding of Chrome Extension APIs

### Development Setup

1. Clone the repository
2. Make your changes to the source files
3. Reload the extension in `chrome://extensions/`
4. Test your changes in Gmail

### Building for Production

1. Ensure all files are properly formatted
2. Test thoroughly across different Gmail scenarios
3. Update version number in `manifest.json`
4. Create a zip file of the entire project (excluding `.git` and other dev files)

## Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

### Development Guidelines

- Follow existing code style and conventions
- Add comments for complex logic
- Test changes thoroughly
- Update documentation as needed

## Privacy & Security

- The extension only accesses Gmail data necessary for its functionality
- No data is transmitted to external servers
- All settings and data are stored locally in Chrome's storage
- The extension respects Gmail's security policies

## 🔍 故障排除

### 常见问题

**扩展在Gmail中不工作:**
- 确保扩展在Chrome中已启用
- 刷新Gmail页面
- 检查Gmail是否使用标准界面（非基础HTML）
- 检查Service Worker是否正常运行

**标签未自动应用:**
- 验证设置中已启用自动应用
- 检查原始邮件是否有标签
- 确保您在回复（而非转发）邮件
- 查看浏览器控制台是否有错误

**自定义标签名称未显示:**
- 确认原始标签名称拼写正确
- 更改后刷新Gmail
- 检查浏览器控制台是否有错误
- 验证Storage API权限

**Service Worker问题:**
- 打开debug.html检查Service Worker状态
- 在chrome://extensions/查看扩展错误
- 检查importScripts路径是否正确
- 确保没有使用浏览器特定API

### 调试模式

1. **使用调试页面**: 打开debug.html查看实时状态
2. **启用调试模式**: 在扩展选项中启用详细日志
3. **检查Service Worker**: 使用内置的Service Worker状态检查
4. **查看控制台**: 在浏览器控制台查看详细错误信息

### 调试工具

- **debug.html**: 扩展状态和Service Worker监控
- **DEBUGGING_GUIDE.md**: 详细的调试指南
- **浏览器开发者工具**: 网络请求和控制台日志
- **Chrome扩展页面**: chrome://extensions/ 查看扩展错误

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📋 更新日志

### Version 1.0.0 (当前版本)
- ✅ 初始发布
- ✅ 自动标签回复功能
- ✅ 自定义标签名称
- ✅ 标签顺序管理
- ✅ 选项页面和弹窗界面
- ✅ 导入/导出设置
- ✅ Service Worker架构优化
- ✅ 调试工具和状态监控
- ✅ 完整的错误处理和日志系统

### Version 1.1.0 (计划中)
- 🔄 性能优化和内存管理改进
- 🔄 更好的Gmail API兼容性
- 🔄 增强的用户界面

## Support

For support, please:
1. Check the troubleshooting section above
2. Search existing issues in the repository
3. Create a new issue with detailed information about your problem

---
