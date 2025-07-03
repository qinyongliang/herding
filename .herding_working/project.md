# Herding MCP 项目信息

## 基本信息
- **项目名称**: Herding MCP（牧羊犬MCP）
- **项目描述**: 督促cursor等AI工具更好地执行任务，提供任务分解、进度跟踪和用户交互功能的MCP服务器
- **作者**: qinyongliang
- **创建时间**: 2025-07-02
- **最后更新**: 2025-07-03 12:43:21
- **版本**: 1.0.9

## 项目结构
```
herding/
├── src/                          # 源代码目录
│   ├── core/                     # 核心模块
│   │   ├── server.ts             # MCP服务器核心
│   │   └── task-matcher.ts       # 智能任务匹配算法
│   ├── tools/                    # MCP工具处理器
│   │   ├── definitions.ts        # 工具定义
│   │   ├── handler.ts            # 工具处理分发
│   │   ├── project-info.ts       # 项目信息获取
│   │   ├── update-info.ts        # 项目信息更新
│   │   ├── init-herding.ts       # 初始化处理
│   │   └── complete-task.ts      # 任务完成处理
│   └── user-interaction/         # 用户交互模块
│       ├── enhanced-plan.ts      # 增强计划处理
│       ├── examples.ts           # 交互示例
│       └── user-ask.ts           # 用户询问处理
├── user-interaction-app/         # Tauri交互应用
│   ├── src/                      # 前端源码
│   │   ├── index.html            # 主界面
│   │   └── app.js                # 交互逻辑
│   └── src-tauri/                # Rust后端
│       ├── src/main.rs           # 主程序
│       └── Cargo.toml            # Rust配置
├── .herding_working/             # 工作目录
│   └── templates/                # 模板文件
├── .github/workflows/            # GitHub Actions
│   └── build-tauri.yml           # 自动编译流程
└── index.ts                      # MCP服务器入口
```

## 技术栈
- **后端**: Node.js + TypeScript + @modelcontextprotocol/sdk
- **前端**: HTML + CSS + JavaScript  
- **桌面应用**: Tauri + Rust + Chrono
- **数据存储**: JSON文件系统
- **构建工具**: TypeScript Compiler + Tauri CLI
- **版本控制**: Git + GitHub
- **CI/CD**: GitHub Actions

## 主要功能

### 核心MCP工具（5个）
1. **get-project-info**: 获取项目完整信息（包含Git用户名和当前时间）
2. **update-project-info**: 更新项目信息和文档
3. **init-herding**: 初始化项目环境和模板
4. **plan**: 智能任务分解和计划创建（支持目标分析）
5. **complete-task**: 完成任务并推荐下一步（支持智能匹配）

### 高级功能
- **智能任务匹配**: 基于汉明距离的任务名称匹配算法
- **交互式编辑器**: Tauri构建的拖拽排序任务编辑界面
- **目标分析**: 每次任务完成后强调项目核心目标
- **进度跟踪**: 自动跟踪任务完成进度和依赖关系
- **撤销支持**: 支持Ctrl+Z撤销操作
- **跨平台**: 支持Windows、macOS、Linux

## 使用说明

### 1. 初始化项目
```bash
# 初始化herding工作环境
init-herding --root-path "D:/project"
```

### 2. 创建任务计划
```bash  
# 创建智能任务计划
plan --title "项目开发计划" --requirement "开发功能X" --goal "实现目标Y"
```

### 3. 执行任务
```bash
# 完成指定任务
complete-task --task-id 1
# 或按标题匹配
complete-task --task-title "分析需求"
```

### 4. 监控进度
```bash
# 获取项目状态
get-project-info --root-path "D:/project"
```

## 开发状态

### ✅ 已完成功能
- [x] 基础MCP架构搭建
- [x] 5个核心工具实现
- [x] 智能任务匹配算法
- [x] Tauri交互界面框架
- [x] GitHub Actions自动编译
- [x] TypeScript编译零错误
- [x] 完整的模块化架构

### 🔄 当前阶段  
- [ ] Rust环境安装和Tauri应用编译
- [ ] 完整的集成测试

### 🎯 下一步计划
- [ ] 发布到GitHub Release  
- [ ] npm包发布

## 注意事项

### 开发规范
- 所有交互UI都使用Tauri实现，不依赖系统
- 新建代码中的author必须正确配置为qinyongliang
- 涉及日期时使用bash的date命令获取当前时间
- 使用Windows路径格式（D:/project）
- 工作目录为.herding_working而非.codelf 