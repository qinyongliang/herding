import { writeFile, mkdir, readdir } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

interface InitHerdingParams {
  rootPath: string;
}

/**
 * 初始化Herding工作环境
 */
export async function handleInitHerding(params: InitHerdingParams): Promise<any> {
  try {
    console.log(`🐕 初始化Herding环境: ${params.rootPath}`);

    // 1. 创建.herding_working目录结构
    await createWorkingDirectory(params.rootPath);
    
    // 2. 创建初始化文件
    const createdFiles = await createInitialFiles(params.rootPath);
    
    // 3. 设置Git配置（如果需要）
    const gitSetup = await setupGitConfiguration(params.rootPath);
    
    // 4. 生成欢迎指南
    const welcomeGuide = generateWelcomeGuide(createdFiles);
    
    return {
      content: [
        {
          type: "text",
          text: `🎉 Herding MCP 工作环境初始化完成！

${welcomeGuide}

🚀 **接下来您可以使用的命令**:
- \`get-project-info\` - 获取项目信息和上下文
- \`plan\` - 创建智能任务计划，支持交互式编辑
- \`complete-task\` - 执行任务并获取下一步指导
- \`update-project-info\` - 更新项目状态

📚 **Herding MCP 特色功能**:
- 🎯 目标导向的任务分解
- 🔄 智能任务匹配和推进
- 🖥️ 交互式任务编辑器（Tauri界面）
- 📊 进度跟踪和任务管理
- 🧠 AI驱动的任务优化

✅ 初始化完成！现在您可以开始使用Herding MCP来提升您的工作效率。`,
        },
      ],
      initInfo: {
        workingDirectory: path.join(params.rootPath, '.herding_working'),
        createdFiles: createdFiles,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error("初始化Herding环境失败:", error);
    return {
      content: [
        {
          type: "text",
          text: `❌ 初始化Herding环境失败: ${
            error instanceof Error ? error.message : String(error)
          }

💡 可能的原因：
1. 文件系统权限不足
2. 项目路径不存在
3. Git配置问题

🔧 解决方案：
1. 检查项目路径权限
2. 确保有写入权限
3. 验证Git配置是否正确

您可以尝试重新运行 init-herding 命令。`,
        },
      ],
    };
  }
}

/**
 * 创建工作目录结构
 */
async function createWorkingDirectory(rootPath: string): Promise<void> {
  const workingDir = path.join(rootPath, '.herding_working');
  
  // 创建主工作目录
  await mkdir(workingDir, { recursive: true });
  
  // 创建子目录
  const subDirs = [
    'templates',
    'logs',
    'sessions',
    'backups'
  ];
  
  for (const subDir of subDirs) {
    await mkdir(path.join(workingDir, subDir), { recursive: true });
  }
  
  console.log(`📁 工作目录结构已创建: ${workingDir}`);
}

/**
 * 创建初始化文件
 */
async function createInitialFiles(rootPath: string): Promise<string[]> {
  const workingDir = path.join(rootPath, '.herding_working');
  const createdFiles: string[] = [];
  
  // 1. 创建配置文件
  const configFile = path.join(workingDir, 'config.json');
  const config = {
    version: "1.0.0",
    projectName: path.basename(rootPath),
    initialized: new Date().toISOString(),
    settings: {
      autoSave: true,
      taskTimeout: 3600000, // 1小时
      maxHistorySize: 100,
      uiTheme: "modern"
    },
    features: {
      interactiveEditor: true,
      smartMatching: true,
      goalAnalysis: true,
      progressTracking: true
    }
  };
  
  await writeFile(configFile, JSON.stringify(config, null, 2), 'utf-8');
  createdFiles.push(configFile);
  
  // 2. 创建README文件
  const readmeFile = path.join(workingDir, 'README.md');
  const readmeContent = `# Herding MCP 工作区

欢迎使用 Herding MCP（牧羊犬 MCP）！这里是您的智能任务管理工作区。

## 📁 目录结构

- \`templates/\` - 任务模板和计划模板
- \`logs/\` - 操作日志和更新记录
- \`sessions/\` - 任务会话和编辑历史
- \`backups/\` - 自动备份文件

## 🚀 快速开始

1. 使用 \`get-project-info\` 获取项目信息
2. 使用 \`plan\` 创建任务计划
3. 使用 \`complete-task\` 执行任务
4. 使用 \`update-project-info\` 更新状态

## 🎯 功能特色

- **目标导向**: 基于目标分析进行智能任务分解
- **交互式编辑**: Tauri界面支持拖拽排序和实时编辑
- **智能匹配**: 基于汉明距离的任务匹配算法
- **进度跟踪**: 完整的任务执行历史和状态管理

## 📊 统计信息

- 初始化时间: ${new Date().toLocaleString()}
- 工作区版本: v1.0.0
- 支持的平台: Windows, macOS, Linux

---
由 Herding MCP 自动生成
`;
  
  await writeFile(readmeFile, readmeContent, 'utf-8');
  createdFiles.push(readmeFile);
  
  // 3. 创建gitignore文件
  const gitignoreFile = path.join(workingDir, '.gitignore');
  const gitignoreContent = `# Herding MCP 工作区忽略文件
*.tmp
*.temp
*.log
sessions/temp-*
backups/auto-*
logs/debug-*

# 系统文件
.DS_Store
Thumbs.db
desktop.ini

# 编辑器文件
.vscode/
.idea/
*.swp
*.swo
*~

# 敏感信息
secrets.json
credentials.json
`;
  
  await writeFile(gitignoreFile, gitignoreContent, 'utf-8');
  createdFiles.push(gitignoreFile);
  
  // 4. 创建任务模板
  const templateFile = path.join(workingDir, 'templates', 'default-plan.json');
  const defaultTemplate = {
    title: "默认任务计划模板",
    description: "这是一个默认的任务计划模板，用于快速创建新的任务计划",
    tasks: [
      {
        id: 1,
        title: "需求分析",
        description: "详细分析用户需求，明确目标和成功标准",
        priority: "high",
        estimatedTime: "30分钟",
        status: "pending"
      },
      {
        id: 2,
        title: "方案设计",
        description: "基于需求分析设计实现方案",
        priority: "high", 
        estimatedTime: "45分钟",
        status: "pending",
        dependencies: [1]
      },
      {
        id: 3,
        title: "具体实现",
        description: "按照设计方案进行具体实现",
        priority: "medium",
        estimatedTime: "2小时",
        status: "pending",
        dependencies: [2]
      }
    ]
  };
  
  await writeFile(templateFile, JSON.stringify(defaultTemplate, null, 2), 'utf-8');
  createdFiles.push(templateFile);
  
  console.log(`📄 已创建 ${createdFiles.length} 个初始化文件`);
  return createdFiles;
}

/**
 * 设置Git配置
 */
async function setupGitConfiguration(rootPath: string): Promise<any> {
  try {
    // 检查是否是Git仓库
    await execAsync('git rev-parse --git-dir', { cwd: rootPath });
    
    // 检查Git用户配置
    const { stdout: username } = await execAsync('git config user.name', { cwd: rootPath });
    const { stdout: email } = await execAsync('git config user.email', { cwd: rootPath });
    
    return {
      isGitRepo: true,
      username: username.trim(),
      email: email.trim(),
      configured: username.trim().length > 0 && email.trim().length > 0
    };
  } catch (error) {
    console.warn("Git配置检查失败:", error);
    return {
      isGitRepo: false,
      configured: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 生成欢迎指南
 */
function generateWelcomeGuide(createdFiles: string[]): string {
  return `🏗️ **创建的文件**:
${createdFiles.map(file => `  ✅ ${path.basename(file)}`).join('\n')}

📋 **工作区结构**:
  📁 .herding_working/
  ├── 📄 config.json      # 配置文件
  ├── 📄 README.md        # 使用说明
  ├── 📄 .gitignore       # Git忽略文件
  ├── 📁 templates/       # 任务模板
  ├── 📁 logs/           # 操作日志
  ├── 📁 sessions/       # 任务会话
  └── 📁 backups/        # 自动备份

🎯 **智能功能已就绪**:
  ✅ 目标导向任务分解
  ✅ 交互式任务编辑器
  ✅ 智能任务匹配算法
  ✅ 进度跟踪和管理
  ✅ 自动备份和恢复`;
} 