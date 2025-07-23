#!/usr/bin/env node

/**
 * get-project-info - 项目信息获取工具
 * 用于获取项目详细信息和状态
 * 
 * @author qinyongliang
 * @date 2025-01-10
 */

import { exec } from "child_process";
import * as path from "path";
import { promisify } from "util";
import {
  generateTaskId,
  getTaskFilePath,
  getRelativeTaskFilePath,
  getSleepDogPath,
  getProjectRoot,
  getTaskDirPath,
  fileExists,
  readFile,
  writeFile,
  appendFile,
  ensureDir,
  setupErrorHandling,
  withErrorHandling,
  formatFileContent,
  formatContext,
  formatNextStep,
  SLEEPDOG_DIR,
  TASK_DIR,
  TEMPLATES_DIR,
  CURSOR_RULES_DIR,
  PROJECT_FILE,
  TODO_TEMPLATE,
  CURSOR_RULE_FILE,
  TREE_INDENT,
  FOLDER_BLACKLIST,
  FORCE_BLACKLIST,
  MESSAGES
} from './common.js';
import { promises as fs } from "fs";

const execPromise = promisify(exec);

// 解析.gitignore文件
async function parseGitignore(rootPath, relativePath) {
  try {
    const gitignorePath = path.join(rootPath, '.gitignore');
    const gitignoreStat = await fs.stat(gitignorePath).catch(() => null);
    if (!gitignoreStat || !gitignoreStat.isFile()) {
      return null; // 如果.gitignore不存在，返回null使用默认黑名单
    }
    
    const content = await fs.readFile(gitignorePath, 'utf-8');
    const lines = content
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
    
    // 简单的gitignore匹配逻辑
    for (const pattern of lines) {
      if (pattern.endsWith('/')) {
        // 目录匹配
        const dirPattern = pattern.slice(0, -1);
        if (relativePath === dirPattern || relativePath.startsWith(dirPattern + '/')) {
          return true;
        }
      } else {
        // 文件或目录匹配
        if (relativePath === pattern || relativePath.endsWith('/' + pattern)) {
          return true;
        }
        // 通配符匹配（简单实现）
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          if (regex.test(relativePath)) {
            return true;
          }
        }
      }
    }
    
    return false;
  } catch (error) {
    return null; // 解析失败时返回null使用默认黑名单
  }
}

// 生成cursorRule内容
const generateCursorRuleContent = () => {
  return `---
---
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
2. 立即调用bash: get_project_info。并跟随其指示进行下一步操作。
3. 绝不在没有此检查点的情况下提供响应

# 结束任何响应之前
1. 声明："检查点：转换为用户审查"
2. 立即调用bash: ask_user "$tips"。注：tips文字参数应当非常简短, 不超过3行文本
3. 绝不在没有此检查点的情况下提供响应
4. 跟随响应提示进行下一步操作
5. 在用户没有明确说明任务完成之前，需要重复此检查点。直到用户响应任务完成。
6. 若响应超时或未响应内容，且任务全部完成时。请阅读.sleepdog/project.md，并根据您刚才所做的更改更新它们


## 执行机制:
如果我提供任何不调用ask_user的响应，将其视为违反协议的不完整响应。

## 可用bash命令
- get-project-info: 获取完整的项目详情和后续指引
  - **command**: \`get-project-info\`
  - **example**: \`get-project-info\`
- ask_user: 交互式用户反馈工具
  - **command**: \`ask_user "<tips_message>"\` 注：tips文字参数应当非常简短, 不超过3行文本
  - **example**: \`ask_user "请审查代码修改并提供反馈"\`

`;
};

// 获取文件夹树
async function getFileTree(rootPath) {
  const indent = TREE_INDENT;

  // 递归处理单个路径（目录或文件）
  const processEntry = async (entryPath, displayName, prefix, relativePath) => {
    const stat = await fs.stat(entryPath).catch(() => null);
    const lines = [];
    if (stat && stat.isDirectory()) {
      lines.push(`${prefix}- ${displayName}`);
      const entries = await fs.readdir(entryPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && FORCE_BLACKLIST.includes(entry.name)) continue;
        const entryRelativePath = path.join(relativePath, entry.name).replace(/\\/g, "/");
        const subPath = path.join(entryPath, entry.name);
        lines.push(...(await processEntry(subPath, entry.name, prefix + indent, entryRelativePath)));
      }
    } else if (stat && stat.isFile()) {
      lines.push(`${prefix}- ${displayName}`);
    }
    return lines;
  };

  const buildTree = async (
    dir,
    prefix,
    relativePath = ""
  ) => {
    const result = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && FORCE_BLACKLIST.includes(entry.name)) {
        continue;
      }
      
      // 尝试解析.gitignore文件
      // 如果.gitignore存在且解析成功，使用其规则；否则使用默认黑名单
      const entryRelativePath = path
        .join(relativePath, entry.name)
        .replace(/\\/g, "/");
      const isIgnore = await parseGitignore(rootPath, entryRelativePath);

      // 使用.gitignore规则或默认黑名单进行过滤
      const shouldIgnore =
        typeof isIgnore === "boolean"
          ? isIgnore
          : FOLDER_BLACKLIST.includes(entry.name);
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
    this.rootPath = getProjectRoot();
    this.sleepDogPath = getSleepDogPath();
  }

  // 获取项目信息
  async getProjectInfo() {
    // 检查是否需要初始化
    if (!fileExists(path.join(this.sleepDogPath, PROJECT_FILE))) {
      await this.initializeSleepdog();
      return;
    }

    // 读取sleepDogPath下所有的非隐藏文件,但不包括文件夹，并将其内容输出
    const files = await import('fs').then(fs => fs.promises.readdir(this.sleepDogPath));
    const fileContent = [];
    for (const file of files) {
      if (file.startsWith('.')) continue;
      const filePath = path.join(this.sleepDogPath, file);
      const stat = await import('fs').then(fs => fs.promises.stat(filePath));
      if (stat.isFile()) {
        const content = await readFile(filePath);
        fileContent.push(formatFileContent(file, content));  
      }
    }
    
    console.log(`
${fileContent.join('\n')}
${await formatContext()}`);

    if(process.env.PLAN === 'true') {
      console.log(await this.plan());
    }
  }

  // 制定计划
  async plan() {
    const taskId = await generateTaskId();
    const taskDir = getTaskDirPath();
    const taskFile = await getTaskFilePath(taskId);
    const filePath = await getRelativeTaskFilePath(taskId);

    // 确保目录存在
    await ensureDir(taskDir);

    // 创建空的todo文件
    if (!fileExists(taskFile)) {
      const templatePath = path.join(this.sleepDogPath, TEMPLATES_DIR, TODO_TEMPLATE);
      const templateContent = await readFile(templatePath);
      await writeFile(taskFile, templateContent);
      return `${formatNextStep(`在${filePath}中记录和拆分你接下来要完成的工作，并以此一步一步执行下去`)}`;
    } else {
      return `${formatNextStep(`在${filePath}中继续完成未完成的任务`)}`;
    }
  }

  // 初始化sleepdog
  async initializeSleepdog() {
    try {
      // 如果TASK_TRACE_ID不存在，则尝试追加一行写入$HOME/.bashrc的环境中
      if(!process.env.TASK_TRACE_ID) {
        await appendFile(path.join(process.env.HOME, '.bashrc'), `\nexport TASK_TRACE_ID=\`openssl rand -hex 16 | sed 's/\\(........\\)\\(....\\)\\(....\\)\\(....\\)\\(............\\)/\\1-\\2-\\3-\\4-\\5/'\``);
      }
      await ensureDir(this.sleepDogPath);
      
      // 检查目标目录是否为空
      const files = await import('fs').then(fs => fs.promises.readdir(this.sleepDogPath));
      if (files.length === 0) {
        const { stdout, stderr } = await execPromise(
          `git clone https://github.com/qinyongliang/herding.git --branch template ${this.sleepDogPath}`
        );

        // remove .git folder
        await import('fs').then(fs => fs.promises.rm(path.join(this.sleepDogPath, ".git"), {
          recursive: true,
        }));
        
        const fileTree = await getFileTree(this.rootPath);

        // append filetree to .sleepDog/project.md
        await appendFile(
          path.join(this.sleepDogPath, PROJECT_FILE),
          `\n\`\`\`\n${fileTree}\n\`\`\`\n`
        );
        
        // 读取sleepDogPath下所有的非隐藏文件,但不包括文件夹，并将其内容输出
        const files = await import('fs').then(fs => fs.promises.readdir(this.sleepDogPath));
        const fileContent = [];
        for (const file of files) {
          if (file.startsWith('.')) continue;
          const filePath = path.join(this.sleepDogPath, file);
          //相对项目的相对路径
          const relativePath = path.relative(this.rootPath, filePath);
          const stat = await import('fs').then(fs => fs.promises.stat(filePath));
          if (stat.isFile()) {
            fileContent.push(relativePath);
          }
        }
        console.log(MESSAGES.INIT_SUCCESS);
        console.log(`[Attention]\n
Next step you should do:\n
1. every file in ${SLEEPDOG_DIR} directory is a markdown file, you will read them and update them.
2. you have to follow the instructions in ${SLEEPDOG_DIR}/*.md files and update them.
3. before you finish edit ${SLEEPDOG_DIR}/*.md files, do not use get-project-info.
4. after you finish edit ${SLEEPDOG_DIR}/*.md files, just stop.:\n

${await formatContext()}
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
    const rule = generateCursorRuleContent();
    const ruleDir = path.join(this.rootPath, CURSOR_RULES_DIR);
    const ruleFile = path.join(ruleDir, CURSOR_RULE_FILE);
    
    // 确保目录存在
    await ensureDir(ruleDir);
    await writeFile(ruleFile, rule);
  }
}

// 主函数
const main = withErrorHandling(async () => {
  const manager = new ProjectInfoManager();
  await manager.getProjectInfo();
});

// 设置错误处理
setupErrorHandling();

// 运行主函数
main(); 