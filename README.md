# Herding - Codelf项目管理工具集

> 独立的命令行工具集，用于管理项目文档和信息。原本是MCP服务器功能，现已拆分为3个独立的可执行命令。

## 功能特性

- 🚀 **独立运行**: 无需MCP协议，直接在命令行中使用
- 📁 **项目信息管理**: 智能读取和管理项目文档
- 🔧 **自动初始化**: 快速为新项目建立文档结构
- 📝 **文档同步**: 确保项目文档与代码保持同步
- 🤖 **AI友好**: 专为AI代理和Cursor等开发环境优化

## 安装

### 本地安装
```bash
git clone https://github.com/qinyongliang/herding.git
cd herding
npm install
```

### 全局安装
```bash
npm install -g .
# 或者
npm run install-global
```

## 命令介绍

### 1. get-project-info
获取项目的完整信息和文档结构。

```bash
get-project-info <项目根路径>
```

**功能**:
- 读取项目根目录下的 `.codelf/*.md` 文件
- 返回格式化的项目信息
- 包括项目结构、开发注意事项等
- **强烈推荐在所有开发场景下使用**

**示例**:
```bash
get-project-info "D:/my-project"
get-project-info "/usr/local/my-project"
```

### 2. update-project-info
提醒更新项目信息和文档。

```bash
update-project-info <项目根路径>
```

**功能**:
- 检查项目文档状态
- 提供更新指导
- 确保文档与代码同步

**使用场景**:
- 完成代码修改后立即运行
- 定期维护项目文档

### 3. init-codelf
初始化项目的codelf配置和文档结构。

```bash
init-codelf <项目根路径>
```

**功能**:
- 创建 `.codelf` 目录
- 从模板仓库克隆初始配置
- 自动生成项目文件树
- 建立文档管理基础

**执行过程**:
1. 创建 `.codelf` 目录
2. 从 GitHub 克隆模板文件
3. 生成项目文件树
4. 清理临时文件

## 使用指南

### 新项目工作流程

1. **初始化项目文档**:
   ```bash
   init-codelf "D:/my-new-project"
   ```

2. **编辑生成的文档**:
   - 打开 `.codelf/project.md` 完善项目信息
   - 更新 `.codelf/changelog.md` 记录变更

3. **获取项目信息**:
   ```bash
   get-project-info "D:/my-new-project"
   ```

4. **开发过程中保持文档同步**:
   ```bash
   # 修改代码后
   update-project-info "D:/my-new-project"
   # 然后按提示更新相关文档
   ```

### 现有项目工作流程

1. **检查是否已有 `.codelf` 目录**:
   - 如果有，直接使用 `get-project-info`
   - 如果没有，先运行 `init-codelf`

2. **日常使用**:
   ```bash
   # 开始编码前获取项目信息
   get-project-info "D:/existing-project"
   
   # 完成修改后更新文档
   update-project-info "D:/existing-project"
   ```

## 在AI开发环境中的使用

### Cursor集成
本工具专为Cursor等AI开发环境优化：

1. **编码前**: 运行 `get-project-info` 让AI了解项目结构
2. **编码后**: 运行 `update-project-info` 保持文档同步
3. **新项目**: 使用 `init-codelf` 快速建立文档基础

### 最佳实践
- 将命令集成到开发工作流中
- 定期使用 `get-project-info` 获取最新项目状态
- 每次重要修改后运行 `update-project-info`

## 技术要求

- **Node.js**: >= 14.0.0
- **Git**: 用于克隆模板仓库
- **网络连接**: 初始化时需要访问GitHub

## 项目结构

```
herding/
├── bin/                    # 可执行命令
│   ├── get-project-info.js
│   ├── update-project-info.js
│   └── init-codelf.js
├── lib/                    # 共享工具函数
│   └── utils.js
├── doc/task/              # 任务文档
│   └── mcp-拆分todo.md
├── package.json
├── .cursorrules           # Cursor规则配置
└── README.md             # 本文件
```

## 依赖项

- `gitignore-parser`: 用于解析.gitignore文件

## 开发信息

- **作者**: qinyongliang
- **创建日期**: 2025-07-03
- **版本**: 1.0.0
- **许可证**: MIT

## 与原MCP服务器的对比

这些命令完全复制了原MCP服务器的功能：

| MCP工具 | 独立命令 | 功能 |
|---------|----------|------|
| `get-project-info` | `get-project-info` | 获取项目信息 |
| `update-project-info` | `update-project-info` | 更新项目信息 |
| `init-codelf` | `init-codelf` | 初始化codelf配置 |

**主要优势**:
- 无需MCP协议支持
- 直接在终端使用
- 更好的跨平台兼容性
- 简化的部署和分发

## 故障排除

### 常见问题

1. **命令未找到**:
   - 确保已正确安装依赖: `npm install`
   - 检查Node.js版本: `node --version`

2. **权限错误**:
   - 确保对项目目录有读写权限
   - Windows用户可能需要以管理员身份运行

3. **网络问题**:
   - `init-codelf` 需要访问GitHub
   - 检查网络连接和防火墙设置

4. **路径问题**:
   - Windows使用双引号: `"D:/project"`
   - Unix系统使用: `"/usr/local/project"`

## 贡献

欢迎提交Issue和Pull Request！

## 许可证

MIT License - 详见LICENSE文件
