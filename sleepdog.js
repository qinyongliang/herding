#!/usr/bin/env node

/**
 * Sleepdog - 牧羊犬项目管理工具
 * 用于监督AI更好地进行开发的可执行JS脚本
 * 
 * @author qinyongliang
 * @date 2025-07-03
 */

import { exec } from "child_process";
import { existsSync, promises as fs } from "fs";
import * as path from "path";
import { promisify } from "util";
import * as os from "os";

const execPromise = promisify(exec);

// 系统类型检测
const SYSTEM_TYPE = os.platform();
const IS_WINDOWS = SYSTEM_TYPE === 'win32';
const IS_MAC = SYSTEM_TYPE === 'darwin';
const IS_LINUX = SYSTEM_TYPE === 'linux';

// 默认黑名单配置
const folderBlackList = [
  "node_modules",
  ".sleepdog",
  ".git",
  ".idea",
  ".vscode",
  "dist",
  "build",
  "out",
  "target",
  "bin",
  "obj",
  ".next",
  "coverage",
  "__pycache__",
  ".DS_Store",
  "tmp",
  "temp",
  "logs",
  ".cache",
  ".github",
  ".gitlab",
  "vendor",
];

const forceBlackList = [".git", ".sleepdog", ".vscode", ".idea"];

// 获取当前工作目录
const getCurrentPath = () => {
  return process.cwd();
};

// 获取命令名称（基于调用方式）
const getCommandName = () => {
  const scriptPath = process.argv[1];
  const baseName = path.basename(scriptPath, '.js');
  return baseName;
};

// 获取PPID
const getPPID = () => {
  return process.ppid;
};

// 获取当前时间
const getCurrentTime = () => {
  return new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// 获取git用户名
const getGitUserName = async () => {
  try {
    const { stdout } = await execPromise('git config user.name');
    return stdout.trim();
  } catch (error) {
    return 'unknown';
  }
};

// 生成cursorRule
const generateCursorRule = () => {
  return `# AI Agent Protocol: Project Management with Sleepdog

## 项目管理工具集成
本项目使用Sleepdog牧羊犬工具进行项目管理和AI开发监督。

### 可用命令
- \`get-project-info\`: 获取完整的项目详情和注意事项，对LLM/Agent编辑代码极其重要
- \`plan\`: 创建任务规划文件，用于记录和拆分工作任务
- \`ask_user\`: 交互式用户反馈工具，支持任务状态检查

### 使用指南
1. 在开始任何代码修改前，必须先调用 \`get-project-info\` 获取项目信息
2. 对于复杂任务，使用 \`plan\` 创建任务规划并逐步执行
3. 使用 \`ask_user\` 进行用户交互和任务状态确认

### 项目结构
- \`.sleepdog/\`: 项目管理文件夹
  - \`project.md\`: 项目信息和结构
  - \`config.json\`: 配置文件
  - \`task/\`: 任务规划文件夹

### 注意事项
- 所有输出都针对cursor，内容需要严肃清晰表达
- 绝对不要使用emoji
- 路径格式适配Windows系统
- 作者信息设置为qinyongliang
- 使用中文简体进行交流

### 工作流程
1. 获取项目信息 → 2. 制定计划 → 3. 执行任务 → 4. 用户确认 → 5. 完成任务

这个工具的核心目的是为了监督AI更好地进行开发，确保开发过程的规范性和可追溯性。`;
};

// 命令路由器
class CommandRouter {
  constructor() {
    this.commands = {
      'get-project-info': this.getProjectInfo.bind(this),
      'plan': this.plan.bind(this),
      'ask_user': this.askUser.bind(this),
    };
  }

  async route() {
    const commandName = getCommandName();
    const command = this.commands[commandName] || this.getProjectInfo.bind(this);

    try {
      await command();
    } catch (error) {
      console.error(`执行命令 ${commandName} 时发生错误: ${error.message}`);
      process.exit(1);
    }
  }

  // get-project-info 命令实现
  async getProjectInfo() {
    const rootPath = getCurrentPath();
    const sleepDogPath = path.join(rootPath, '.sleepdog');

    // 检查是否需要初始化
    if (!existsSync(path.join(sleepDogPath, 'project.md'))) {
      await this.initializeSleepdog(rootPath);
      return;
    }

    // 读取项目信息
    const content = await this.readProjectInfo(rootPath);
    const gitUserName = await getGitUserName();
    const currentTime = getCurrentTime();

    const result = {
      projectInfo: content,
      gitUserName: gitUserName,
      currentTime: currentTime
    };

    console.log(JSON.stringify(result, null, 2));
  }

  // plan 命令实现
  async plan() {
    const ppid = getPPID();
    const rootPath = getCurrentPath();
    const taskDir = path.join(rootPath, '.sleepdog', 'task');
    const taskFile = path.join(taskDir, `${ppid}-todo.md`);

    // 确保目录存在
    await fs.mkdir(taskDir, { recursive: true });

    // 创建空的todo文件
    if (!existsSync(taskFile)) {
      await fs.writeFile(taskFile, '');
    }

    console.log(`你需要在.sleepdog/task/${ppid}-todo.md中记录和拆分你接下来要完成的工作，并以此一步一步执行下去`);
  }

  // ask_user 命令实现
  async askUser() {
    const args = process.argv.slice(2);
    const tips = args[0] || '请提供反馈';

    // 检查是否在交互式环境中
    if (process.stdin.isTTY) {
      return await this.interactiveInput(tips);
    } else {
      // 非交互式环境，直接检查未完成任务
      return await this.checkUnfinishedTasks();
    }
  }

  // 交互式输入处理
  async interactiveInput(tips) {
    console.log(`提示: ${tips}`);
    console.log('请输入您的反馈 (按Enter结束，输入空行将检查未完成任务):');

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question('> ', (answer) => {
        rl.close();

        if (answer.trim() === '') {
          // 检查是否有未完成的任务
          this.checkUnfinishedTasks().then(result => {
            console.log(result);
            resolve(result);
          });
        } else {
          console.log(answer);
          resolve(answer);
        }
      });
    });
  }

  // 检查未完成的任务
  async checkUnfinishedTasks() {
    const ppid = getPPID();
    const rootPath = getCurrentPath();
    const taskFile = path.join(rootPath, '.sleepdog', 'task', `${ppid}-todo.md`);

    if (!existsSync(taskFile)) {
      return '任务完成';
    }

    const content = await fs.readFile(taskFile, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.includes('[ ]')) {
        return `在.sleepdog/task/${ppid}-todo.md找到尚未完成的任务：${line.trim()}。请继续此任务`;
      }
    }

    return '任务完成';
  }

  // 初始化sleepdog
  async initializeSleepdog(rootPath) {
    const sleepDogPath = path.join(rootPath, '.sleepdog');

    try {
      await fs.mkdir(sleepDogPath, { recursive: true });
      // 检查目标目录是否为空
      const files = await fs.readdir(sleepDogPath);
      if (files.length === 0) {
        // 目录为空，执行 git clone
        const { stdout, stderr } = await execPromise(
          `git clone https://github.com/Disdjj/sleepDog-template ${path.join(
            rootPath,
            ".sleepdog"
          )}`
        );

        // remove .git folder
        await fs.rm(path.join(sleepDogPath, ".git"), {
          recursive: true,
        });
        const fileTree = await getFileTree(rootPath);

        // append filetree to .sleepDog/project.md
        await fs.appendFile(
          path.join(sleepDogPath, "project.md"),
          `\n\`\`\`\n${fileTree}\n\`\`\`\n`
        );
        console.log(`Successfully initialized .sleepDog directory with template.\nOutput: ${stdout}\n${stderr ? `Error: ${stderr}` : ""
          }`);
        console.log(`[Attention]\n
              Next step you should do:\n
              1. every file in .sleepDog directory is a markdown file, you can read them and update them.
              2. you have to follow the instructions in .sleepDog/*.md files and update them.
              3. before you finish edit .sleepDog/*.md files, do not use update-project-info/get-project-info.
              4. after you finish edit .sleepDog/*.md files, just stop.
              `)
      }

      // 自动创建快捷方式
      await this.createShortcuts();
    } catch (error) {
      throw error;
    }
  }

  // 读取项目信息
  async readProjectInfo(rootPath) {
    const sleepDogPath = path.join(rootPath, '.sleepdog');
    const projectFile = path.join(sleepDogPath, 'project.md');

    if (!existsSync(projectFile)) {
      return null;
    }

    const content = await fs.readFile(projectFile, 'utf-8');
    return content;
  }

  // 获取文件树
  async getFileTree(rootPath) {
    const indent = "    ";

    const processEntry = async (entryPath, displayName, prefix, relativePath) => {
      const stat = await fs.stat(entryPath).catch(() => null);
      const lines = [];

      if (stat && stat.isDirectory()) {
        lines.push(`${prefix}- ${displayName}/`);
        const entries = await fs.readdir(entryPath, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory() && forceBlackList.includes(entry.name)) continue;

          const entryRelativePath = path.join(relativePath, entry.name).replace(/\\/g, "/");
          const subPath = path.join(entryPath, entry.name);
          lines.push(...(await processEntry(subPath, entry.name, prefix + indent, entryRelativePath)));
        }
      } else if (stat && stat.isFile()) {
        lines.push(`${prefix}- ${displayName}`);
      }

      return lines;
    };

    const buildTree = async (dir, prefix, relativePath = "") => {
      const result = [];
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && forceBlackList.includes(entry.name)) {
          continue;
        }

        const entryRelativePath = path.join(relativePath, entry.name).replace(/\\/g, "/");

        // 使用默认黑名单进行过滤
        const shouldIgnore = folderBlackList.includes(entry.name);

        if (!shouldIgnore) {
          const entryPath = path.join(dir, entry.name);
          result.push(...(await processEntry(entryPath, entry.name, prefix, entryRelativePath)));
        }
      }

      return result;
    };

    const result = await buildTree(rootPath, "", "");
    return ["root", ...result].join("\n");
  }

  // 生成cursorRule命令实现
  async generateCursorRule() {
    const rule = generateCursorRule();
    const rootPath = getCurrentPath();
    const ruleFile = path.join(rootPath, '.cursor/rules/SleepDog.mdc');

    await fs.writeFile(ruleFile, rule);
    console.log(rule);
  }

  // 创建快捷方式
  async createShortcuts() {
    const rootPath = getCurrentPath();
    const sleepDogScript = path.join(rootPath, 'sleepdog.js');
    const commands = ['get-project-info', 'plan', 'ask_user'];
    for (const command of commands) {
      try {
        await this.createShortcut(command, sleepDogScript, rootPath);
      } catch (error) {
      }
    }
  }

  // 创建单个快捷方式
  async createShortcut(commandName, scriptPath, rootPath) {
    if (IS_WINDOWS) {
      // Windows: 创建批处理文件
      const batchContent = `@echo off
"node.exe" "${scriptPath}" %*
`;
      const batchFile = path.join(rootPath, `${commandName}.bat`);

      if (!existsSync(batchFile)) {
        await fs.writeFile(batchFile, batchContent);
      }
    } else {
      // Unix/Linux/Mac: 创建符号链接
      const linkPath = path.join(rootPath, commandName);

      if (!existsSync(linkPath)) {
        await fs.symlink(scriptPath, linkPath);
        // 设置执行权限
        await fs.chmod(linkPath, 0o755);
      }
    }
  }

  // setup 命令实现
  async setup() {
    const rootPath = getCurrentPath();
    const sleepDogPath = path.join(rootPath, '.sleepdog');

    // 检查是否需要初始化
    if (!existsSync(sleepDogPath)) {
      await this.initializeSleepdog(rootPath);
    } else {
      // 只创建快捷方式
      await this.createShortcuts();
    }

    // 生成cursorRule
    await this.generateCursorRule();
  }
}

// 主函数
async function main() {
  const router = new CommandRouter();
  await router.route();
}

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 运行主函数
main().catch((error) => {
  console.error('主函数执行失败:', error.message);
  process.exit(1);
}); 