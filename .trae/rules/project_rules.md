## ✅ 功能目标
> Chrome 扩展 - Gmail标签管理器
> 当用户回复一封已打上 label 的邮件时，自动将该 label 应用于回复邮件（或提示用户手动添加）。
> 用户可以自由调整边栏label顺序
> The real label (as stored on Google's servers) remains unchanged, Your browser shows only the custom name you've defined.

## 📊 项目状态

### 已完成功能 ✅
- Service Worker架构实现
- 消息处理系统
- 存储管理模块
- 调试工具和状态监控
- Service Worker兼容性优化
- 错误处理和日志系统

### 开发中功能 🔄
- Gmail API拦截器
- DOM观察器
- 标签自动应用逻辑
- 用户界面组件

### 待开发功能 📋
- 标签顺序管理
- 自定义标签名称
- 选项页面完整实现
- 弹窗界面优化

## 🏗️ 项目架构

```
gmail-label-extension/
├── manifest.json                 # 扩展配置文件
├── src/
│   ├── background/
│   │   ├── background.js         # 后台服务工作者
│   │   └── message-handler.js    # 消息处理
│   ├── content/
│   │   ├── content.js           # 内容脚本
│   │   ├── gmail-interceptor.js # Gmail API 拦截器
│   │   └── dom-observer.js      # DOM 观察器
│   ├── popup/
│   │   ├── popup.html           # 弹窗界面
│   │   ├── popup.js             # 弹窗逻辑
│   │   └── popup.css            # 弹窗样式
│   ├── options/
│   │   ├── options.html         # 选项页面
│   │   ├── options.js           # 选项逻辑
│   │   └── options.css          # 选项样式
│   └── shared/
│       ├── storage.js           # 存储管理
│       ├── utils.js             # 工具函数
│       └── constants.js         # 常量定义
├── assets/
│   ├── icons/                   # 图标资源
│   └── styles/                  # 全局样式
└── tests/                       # 测试文件
```

## 🧩 核心模块职责

### 1. Background 模块
**职责**: 扩展的核心后台服务
- 监听 Gmail API 调用
- 管理标签数据同步
- 处理内容脚本通信
- 维护扩展状态

### 2. Content Script 模块
**职责**: 与 Gmail 界面交互
- 拦截 Gmail 的 XMLHttpRequest/Fetch 请求
- 监听邮件回复事件
- 操作 DOM 元素
- 应用自定义标签显示

### 3. Gmail Interceptor 模块
**职责**: Gmail API 数据拦截与处理
- 拦截标签相关 API 响应
- 解析邮件和标签数据
- 应用自定义标签名称
- 检测回复邮件场景

### 4. DOM Observer 模块
**职责**: 监控 Gmail 界面变化
- 观察标签显示区域变化
- 检测新邮件加载
- 监听用户交互事件
- 触发标签应用逻辑

### 5. Storage 模块
**职责**: 数据持久化管理
- 存储用户自定义标签映射
- 保存标签顺序配置
- 管理用户偏好设置
- 提供数据访问接口

### 6. Popup 模块
**职责**: 扩展弹窗界面
- 显示当前标签配置
- 提供标签管理功能
- 展示使用说明
- 快速开关设置

### 7. Options 模块
**职责**: 扩展选项配置页面
- 标签顺序调整界面
- 自定义名称管理
- 高级设置配置
- 数据导入导出

## 🔧 技术要点提醒

### 核心开发原则
1. **权限管理**: 确保只申请必要权限，遵循最小权限原则
2. **性能优化**: 避免频繁 DOM 操作，使用防抖和节流
3. **用户体验**: 流畅的交互和清晰的提示信息
4. **Service Worker兼容性**: 确保后台脚本在Service Worker环境中正常运行

### 代码规范
1. **文件组织**: 按功能模块组织代码，保持清晰的目录结构
2. **注释规范**: 所有函数必须有中文注释说明功能和参数
3. **错误处理**: 完善的错误捕获和日志记录机制
4. **兼容性**: 确保代码在不同Chrome版本中的兼容性

### Service Worker特殊要求
1. **导入路径**: 使用相对于扩展根目录的路径进行importScripts
2. **API限制**: 避免在Service Worker中使用DOM API和window对象
3. **工具分离**: 使用utils-sw.js作为Service Worker专用工具文件
4. **初始化**: 确保backgroundService.initialize()被正确调用

### 调试和测试
1. **调试工具**: 使用debug.html进行实时状态监控
2. **错误追踪**: 完整的错误日志和状态报告
3. **Service Worker检查**: 定期验证Service Worker注册状态
4. **性能监控**: 监控内存使用和响应时间

### 安全考虑
1. **数据隐私**: 所有数据本地存储，不传输到外部服务器
2. **权限最小化**: 只申请必要的Chrome API权限
3. **输入验证**: 对所有用户输入进行验证和清理
4. **安全更新**: 及时更新依赖和修复安全漏洞
