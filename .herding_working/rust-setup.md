# Rust 环境安装和 Tauri 应用编译指导

**目标**: 安装Rust开发环境并编译Herding MCP的交互式Tauri应用

## 🦀 第一步：安装 Rust 环境

### Windows 系统安装 (当前系统)

1. **下载 Rust 安装器**
   - 访问官网：https://rustup.rs/
   - 下载 `rustup-init.exe`

2. **运行安装器**
   ```bash
   # 下载完成后运行安装器
   rustup-init.exe
   ```

3. **选择安装选项**
   - 选择 `1) Proceed with installation (default)`
   - 等待安装完成（约5-10分钟）

4. **重启终端**
   ```bash
   # 重新打开Git Bash或PowerShell
   # 验证安装
   cargo --version
   rustc --version
   ```

### 替代安装方法

如果官网下载较慢，可使用国内镜像：

```bash
# 使用清华大学镜像
curl --proto '=https' --tlsv1.2 -sSf https://mirrors.tuna.tsinghua.edu.cn/rustup/rustup-init.exe -o rustup-init.exe
rustup-init.exe
```

## 🔧 第二步：配置 Rust 环境

### 设置国内源（提高下载速度）

创建配置文件：
```bash
# 在用户目录下创建 .cargo 文件夹
mkdir -p ~/.cargo

# 创建 config 文件
cat > ~/.cargo/config << EOF
[source.crates-io]
registry = "https://github.com/rust-lang/crates.io-index"
replace-with = 'tuna'

[source.tuna]
registry = "https://mirrors.tuna.tsinghua.edu.cn/git/crates.io-index.git"
EOF
```

### 安装必要的组件

```bash
# 更新工具链
rustup update

# 安装Windows构建工具（如果需要）
rustup target add x86_64-pc-windows-msvc
```

## 🚀 第三步：编译 Tauri 应用

### 进入项目目录

```bash
cd D:/project/js/herding/user-interaction-app/src-tauri
```

### 编译调试版本

```bash
# 编译调试版本（较快，用于开发测试）
cargo build

# 编译时可能需要下载依赖，首次编译约10-20分钟
```

### 编译发布版本

```bash
# 编译优化的发布版本（较慢，用于生产环境）
cargo build --release

# 编译完成后，可执行文件位置：
# target/debug/herding-ui.exe (调试版)
# target/release/herding-ui.exe (发布版)
```

### 运行 Tauri 应用

```bash
# 运行调试版本
cargo run

# 或直接运行可执行文件
./target/debug/herding-ui.exe

# 运行发布版本
./target/release/herding-ui.exe
```

## 🧪 第四步：测试集成功能

### 完整功能测试

回到项目根目录，重新运行完整测试：

```bash
cd D:/project/js/herding

# 重新运行功能测试（现在应该包含Tauri应用启动）
node test-herding.js
```

### 手动测试 plan 工具

```bash
# 启动MCP服务器
node build/index.js

# 在另一个终端中测试plan命令
# (需要MCP客户端支持，如Cursor等)
```

## 🛠️ 故障排除

### 常见问题和解决方案

#### 1. Cargo 命令未找到
```bash
# 解决方案：重启终端或手动添加PATH
source ~/.cargo/env
```

#### 2. 编译错误：链接器找不到
```bash
# Windows上可能需要安装Visual Studio Build Tools
# 下载：https://visualstudio.microsoft.com/visual-cpp-build-tools/
```

#### 3. 依赖下载缓慢
```bash
# 使用代理或切换到国内源（如上面的配置）
# 或使用科学上网工具
```

#### 4. 内存不足
```bash
# 大型项目编译时可能需要较多内存
# 可以尝试单线程编译：
cargo build --jobs 1
```

### 检查系统要求

```bash
# 确保有足够的磁盘空间（至少5GB）
df -h

# 确保有足够的内存（建议8GB+）
free -h  # Linux
# Windows可通过任务管理器查看
```

## 📋 预期结果

成功完成后，您将拥有：

### ✅ 完整的开发环境
- Rust编译器和Cargo包管理器
- Tauri应用开发工具链
- 跨平台构建能力

### ✅ 编译完成的应用
- 调试版本：快速启动，包含调试信息
- 发布版本：优化性能，适合生产使用
- 跨平台可执行文件

### ✅ 完整的Herding MCP系统
- 所有5个MCP工具正常工作
- Tauri交互式编辑器可用
- plan工具能启动图形界面
- 完整的任务管理工作流

## 🎯 最终验证

### 完整工作流测试

1. **初始化环境**
   ```bash
   # 通过MCP调用
   init-herding --root-path "D:/project/test"
   ```

2. **创建任务计划**
   ```bash
   # 通过MCP调用，应该启动Tauri编辑器
   plan --user-requirement "开发一个博客系统" --plan-title "博客开发计划"
   ```

3. **交互式编辑**
   - Tauri窗口打开
   - 任务可拖拽排序
   - 支持Ctrl+Z撤销
   - 可编辑任务内容

4. **任务执行**
   ```bash
   # 通过MCP调用
   complete-task --task-id 1
   ```

### 成功标准

- ✅ Rust环境安装成功
- ✅ Tauri应用编译无错误
- ✅ 图形界面正常启动
- ✅ 与MCP服务器集成成功
- ✅ 完整工作流程顺畅运行

---

**安装指导创建时间**: 2025-07-02 23:55  
**适用系统**: Windows 10+, Git Bash环境  
**预计安装时间**: 30-60分钟（取决于网络速度）  
**磁盘空间需求**: 5GB+  
**内存需求**: 8GB+ 推荐 