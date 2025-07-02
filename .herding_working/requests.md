# Herding MCP 完整需求文档

**项目名称**: Herding MCP（牧羊犬 MCP）  
**项目目标**: 督促cursor等AI工具更好地执行任务，提供任务分解、进度跟踪和用户交互功能  
**作者**: qinyongliang  
**创建时间**: 2025-07-02  

## 🎯 核心改造需求

### 1. 基础项目改造
- **项目重命名**: 将codelf MCP改造为herding（牧羊犬）MCP
- **目录重构**: 将默认的.codelf文件夹改为.herding_working目录
- **身份信息**: 新建的代码中的author需要正确配置为qinyongliang
- **时间处理**: 只要涉及到需要日期的则使用bash的date命令获取当前时间

### 2. 核心功能扩展

#### 2.1 增强get-project命令
- 在get_project命令中额外返回：
  - 当前用户的git username (`git config user.name`)
  - 当前的时间 (`date`命令)
- 返回完整的项目上下文信息

#### 2.2 新增plan命令
- **功能**: 用来写一批todo，分解任务
- **存储**: 将任务放在.herding_working/{日期}/{时间}.json中
- **智能分析**: 需要分析用户想要达到的目标，并以此为目标拆分任务
- **目标存储**: 在plan计划中应该存储此次计划的目标
- **目标强调**: 每次调用完成单个任务之后，还有后续任务时，额外强调此目标

#### 2.3 新增complete-task命令
- **功能**: 用来完成某个任务item，返回下一个任务
- **智能匹配**: 按时间从新到旧查找任务
- **相似度匹配**: 根据任务名称的汉明距离排序取最接近的
- **友好提示**: 找不到时提示几个汉明距离最接近的item

#### 2.4 新增user_ask命令
- **实现方式**: 使用Tauri构建弹窗进行用户交互
- **功能**: 提供用户交互对话框支持

## 🖥️ 交互式任务规划编辑器需求

### 3.1 技术要求
- **实现方式**: 所有的交互UI都应该使用Tauri实现，而不是依赖系统
- **开发方式**: 所有的文件应该一步一步的从框架开始完成，而不是一次写完

### 3.2 功能需求
- **计划编辑**: plan工具调用后弹出任务编辑窗口
- **拖拽排序**: 支持任务拖动排序（可Ctrl+Z撤销）
- **内容编辑**: 支持任务内容编辑和删除（可Ctrl+Z撤销）
- **重新规划**: 支持用户输入文字重新制订计划
- **会话管理**: 计划session管理（使用文件名作为session ID）
- **结果返回**: 编辑完成后返回新任务ID给cursor

### 3.3 智能任务匹配增强
- **时间排序**: complete-task时按时间从新到旧查找任务
- **距离匹配**: 根据任务名称的汉明距离排序取最接近的
- **智能提示**: 找不到时提示几个汉明距离最接近的item

## 🏗️ 技术架构要求

### 4.1 开发原则
- **渐进式开发**: 采用项目思维，不要全部写在index.ts中
- **模块化架构**: 创建清晰的模块结构
- **类型安全**: 使用TypeScript确保类型安全
- **错误处理**: 完善的错误处理和用户友好提示

### 4.2 工具流程集成
- **自动更新**: 每次完成代码编辑后，调用`update-project-info`并按照响应中的指示进行操作
- **信息获取**: 在回应或修改代码之前，应首先通过`get-project-info`获取全面信息
- **路径格式**: 使用Windows系统路径格式，如"D:/project"

### 4.3 技术栈
- **后端**: Node.js + TypeScript + @modelcontextprotocol/sdk
- **前端**: HTML + CSS + JavaScript
- **桌面应用**: Tauri + Rust
- **数据存储**: JSON文件系统
- **版本控制**: Git

## 📋 具体实现细节

### 5.1 任务数据结构
```json
{
  "id": "number",
  "title": "string",
  "description": "string", 
  "status": "pending|in_progress|completed|blocked",
  "priority": "high|medium|low",
  "estimated_time": "string",
  "dependencies": "number[]",
  "completed": "boolean",
  "completed_at": "string|null"
}
```

### 5.2 计划数据结构
```json
{
  "title": "string",
  "user_requirement": "string",
  "goal": "string",
  "created_at": "string",
  "created_by": "string",
  "status": "string",
  "completed_at": "string|null",
  "tasks": "TaskItem[]",
  "session_id": "string"
}
```

### 5.3 文件组织结构
```
.herding_working/
├── {YYYY-MM-DD}/
│   └── {HH-MM-SS}.json  # 任务计划文件
├── templates/           # 任务模板
├── logs/               # 操作日志
├── sessions/           # 会话数据
└── backups/            # 自动备份
```

## 🎨 用户界面要求

### 6.1 交互式编辑器界面
- **现代设计**: 美观的渐变背景和现代UI设计
- **拖拽支持**: 任务项支持拖拽重新排序
- **实时编辑**: 任务标题和描述可直接编辑
- **撤销功能**: 支持Ctrl+Z撤销操作
- **快捷键**: 支持Ctrl+S保存等快捷键

### 6.2 用户体验
- **加载状态**: 清晰的加载和错误状态提示
- **操作反馈**: 及时的操作反馈和通知
- **响应式设计**: 适配不同屏幕尺寸
- **无障碍支持**: 支持键盘导航和屏幕阅读器

## 🔄 工作流程要求

### 7.1 任务创建流程
1. 用户使用`plan`命令提供需求
2. 系统分析用户目标
3. 智能分解为具体任务
4. 启动Tauri编辑器进行交互式编辑
5. 用户完成编辑后保存并返回结果

### 7.2 任务执行流程
1. 用户使用`complete-task`命令
2. 系统智能匹配任务
3. 标记任务完成
4. 查找下一个可执行任务
5. 强调项目目标并推荐下一步

### 7.3 项目管理流程
1. 使用`init-herding`初始化环境
2. 使用`get-project-info`获取项目状态
3. 使用`update-project-info`更新项目信息
4. 循环使用`plan`和`complete-task`进行任务管理

## 🎯 成功标准

### 8.1 基本功能
- ✅ 所有5个核心工具正常工作
- ✅ 交互式编辑器功能完整
- ✅ 智能任务匹配准确
- ✅ 目标分析和提醒有效

### 8.2 技术质量
- ✅ TypeScript编译零错误
- ✅ 代码结构清晰模块化
- ✅ 错误处理完善
- ✅ 性能优化合理

### 8.3 用户体验
- [ ] 界面美观易用
- [ ] 操作流畅自然
- [ ] 反馈及时准确
- [ ] 学习成本低

## 📝 补充说明

### 9.1 语言要求
- **响应语言**: Always respond in Chinese-simplified
- **界面语言**: 所有用户界面使用中文
- **文档语言**: 所有文档和注释使用中文

### 9.2 开发环境
- **操作系统**: Windows 10 (win32 10.0.22631)
- **Shell**: Git Bash
- **路径格式**: 使用Windows路径格式 (D:/project)
- **工作目录**: /d%3A/project/js/herding

### 9.3 版本管理
- **Git仓库**: https://github.com/qinyongliang/herding.git
- **模板分支**: template分支用于存储初始化模板
- **主分支**: main分支用于主要开发

---

**文档创建时间**: 2025-07-02 23:45  
**最后更新**: 2025-07-02 23:45  
**状态**: 核心功能已完成，进入Tauri集成阶段  
**下一步**: 编译Tauri应用并完成集成测试 