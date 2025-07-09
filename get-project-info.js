#!/usr/bin/env node

/**
 * get-project-info - 项目信息获取工具
 * 用于获取项目详细信息和状态
 * 
 * @author qinyongliang
 * @date 2025-01-10
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
  return `---
description: 
globs: 
alwaysApply: true
---

# 开发指引

需要严格按照以下流程执行此次任务的开发

获取项目信息 → 制定计划 → 执行任务 → 用户确认 → 重新制定计划/继续执行任务/完成任务

# 强制检查点

# 在开始任何响应之前
1. 声明："检查点：获取项目信息"
2. 立即调用bash: get_project_info。
3. 绝不在没有此检查点的情况下提供响应

# 结束任何响应之前=
1. 声明："检查点：转换为用户审查"
2. 立即调用bash: ask_user "$tips"。注：tips文字参数应当非常简短, 不超过3行文本
3. 绝不在没有此检查点的情况下提供响应
4. 跟随响应提示进行下一步操作，直到用户响应任务完成。

## 执行机制:
如果我提供任何不调用ask_user的响应，将其视为违反协议的不完整响应。

## 可用bash命令
- get-project-info\`: 获取完整的项目详情和后续指引
  - **command**: \`get-project-info\`
  - **example**: \`get-project-info\`
- ask_user: 交互式用户反馈工具
  - **command**: \`ask_user "<tips_message>"\` 注：tips文字参数应当非常简短, 不超过3行文本
  - **example**: \`ask_user "请审查代码修改并提供反馈"\`
`;
};

// 获取文件树
async function getFileTree(rootPath) {
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

// 项目信息获取类
class ProjectInfoManager {
  constructor() {
    this.rootPath = getCurrentPath();
    this.sleepDogPath = path.join(this.rootPath, '.sleepdog');
  }

  // 获取项目信息
  async getProjectInfo() {
    // 检查是否需要初始化
    if (!existsSync(path.join(this.sleepDogPath, 'project.md'))) {
      await this.initializeSleepdog();
      return;
    }

    // 读取项目信息
    const gitUserName = await getGitUserName();
    const currentTime = getCurrentTime();
    
    // 读取sleepDogPath下所有的非隐藏文件,但不包括文件夹，并将其内容输出
    const files = await fs.readdir(this.sleepDogPath);
    const fileContent = [];
    for (const file of files) {
      if (file.startsWith('.')) continue;
      const filePath = path.join(this.sleepDogPath, file);
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        const content = await fs.readFile(filePath, 'utf-8');
        fileContent.push(`<file:${file}>\n${content}\n</file:${file}>`);  
      }
    }
    
    console.log(`
${fileContent.join('\n')}
<context>
${JSON.stringify({
      userName: gitUserName,
      currentTime: currentTime
    }, null, 2)}
</context>
    `);
    
    await this.plan();
  }

  // 制定计划
  async plan() {
    // 当前日期(yyyyMMdd)+ppid
    const taskId = `${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '')}-${getPPID()}`;
    const taskDir = path.join(this.sleepDogPath, 'task');
    const taskFile = path.join(taskDir, `${taskId}-todo.md`);
    const filePath = path.join('.sleepdog', 'task', `${taskId}-todo.md`);

    // 确保目录存在
    await fs.mkdir(taskDir, { recursive: true });

    // 创建空的todo文件
    if (!existsSync(taskFile)) {
      await fs.writeFile(taskFile, await fs.readFile(path.join(this.sleepDogPath, 'templates', '_todo.md'), 'utf-8'));
      console.log(`<next-step>你需要在${filePath}中记录和拆分你接下来要完成的工作，并以此一步一步执行下去</next-step>
<file:${filePath}>
${await fs.readFile(taskFile, 'utf-8')}
</file:${filePath}>`);
    } else {
      console.log(`<next-step>当前正在进行${filePath}中的任务，请继续完成未完成的任务</next-step>
<file:${filePath}>
${await fs.readFile(taskFile, 'utf-8')}
</file:${filePath}>`);
    }
  }

  // 初始化sleepdog
  async initializeSleepdog() {
    try {
      await fs.mkdir(this.sleepDogPath, { recursive: true });
      
      // 检查目标目录是否为空
      const files = await fs.readdir(this.sleepDogPath);
      if (files.length === 0) {
        const { stdout, stderr } = await execPromise(
          `git clone https://gh-proxy.net/https://github.com/qinyongliang/herding.git --branch template ${this.sleepDogPath}`
        );

        // remove .git folder
        await fs.rm(path.join(this.sleepDogPath, ".git"), {
          recursive: true,
        });
        
        const fileTree = await getFileTree(this.rootPath);

        // append filetree to .sleepDog/project.md
        await fs.appendFile(
          path.join(this.sleepDogPath, "project.md"),
          `\n\`\`\`\n${fileTree}\n\`\`\`\n`
        );
        
        // 读取sleepDogPath下所有的非隐藏文件,但不包括文件夹，并将其内容输出
        const files = await fs.readdir(this.sleepDogPath);
        const fileContent = [];
        for (const file of files) {
          if (file.startsWith('.')) continue;
          const filePath = path.join(this.sleepDogPath, file);
          //相对项目的相对路径
          const relativePath = path.relative(this.rootPath, filePath);
          const stat = await fs.stat(filePath);
          if (stat.isFile()) {
            const content = await fs.readFile(filePath, 'utf-8');
            fileContent.push(`<file:${relativePath}>\n${content}\n</file:${relativePath}>`);  
          }
        }
        console.log(`Successfully initialized .sleepDog directory with template`);
        console.log(`[Attention]\n
Next step you should follow the instructions and update the files:\n
${fileContent.join('\n')}
`);
      }

      // 生成cursorRule
      await this.generateCursorRule();
    } catch (error) {
      throw error;
    }
  }

  // 生成cursorRule
  async generateCursorRule() {
    const rule = generateCursorRule();
    const ruleDir = path.join(this.rootPath, '.cursor/rules');
    const ruleFile = path.join(ruleDir, 'SleepDog.mdc');
    
    // 确保目录存在
    await fs.mkdir(ruleDir, { recursive: true });
    await fs.writeFile(ruleFile, rule);
  }
}

// 主函数
async function main() {
  try {
    const manager = new ProjectInfoManager();
    await manager.getProjectInfo();
  } catch (error) {
    console.error(`执行get-project-info时发生错误: ${error.message}`);
    process.exit(1);
  }
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