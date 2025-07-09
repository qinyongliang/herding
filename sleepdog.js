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

// 命令路由器
class CommandRouter {
  constructor() {
    this.commands = {
      'get-project-info': this.getProjectInfo.bind(this),
      'ask_user': this.askUser.bind(this),
      'init': this.init.bind(this),
      'setup': this.setup.bind(this),
      '--version': this.showVersion.bind(this),
      '-v': this.showVersion.bind(this),
    };
  }

  async route() {
    const commandName = getCommandName();
    let args = process.argv.slice(2);
    
    // 优先使用命令名路由（npm bin配置）
    let command = this.commands[commandName];
    
    if (!command) {
      // 如果命令名没有匹配，尝试第一个参数
      command = this.commands[args[0]];
      if (command) {
        // 如果第一个参数匹配了命令，移除它
        args = args.slice(1);
      } else {
        // 如果都没有匹配，根据情况选择默认命令
        if (commandName === 'herding') {
          // herding 命令的默认行为
          if (args.length === 0 || (args.length === 1 && args[0] === '.')) {
            command = this.init.bind(this);
          } else {
            command = this.getProjectInfo.bind(this);
          }
        } else {
          // 其他情况默认执行get-project-info
          command = this.getProjectInfo.bind(this);
        }
      }
    }

    try {
      await command(args);
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
    const gitUserName = await getGitUserName();
    const currentTime = getCurrentTime();
    //读取sleepDogPath下所有的非隐藏文件,但不包括文件夹，并将其内容输出
    const files = await fs.readdir(sleepDogPath);
    const fileContent = [];
    for (const file of files) {
      if (file.startsWith('.')) continue;
      const filePath = path.join(sleepDogPath, file);
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

  // plan 命令实现
  async plan() {
    //当前日期(yyyyMMdd)+ppid
    const taskId = `${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '')}-${getPPID()}`;
    const rootPath = path.join(getCurrentPath(), '.sleepdog');
    const taskDir = path.join(rootPath, 'task');
    const taskFile = path.join(taskDir, `${taskId}-todo.md`);

    const filePath = path.join('.sleepdog', 'task', `${taskId}-todo.md`);

    // 确保目录存在
    await fs.mkdir(taskDir, { recursive: true });

    // 创建空的todo文件
    if (!existsSync(taskFile)) {
      await fs.writeFile(taskFile, await fs.readFile(path.join(rootPath, 'templates', '_todo.md'), 'utf-8'));
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

  // ask_user 命令实现
  async askUser(args) {
    const tips = args.join(' ') || '请提供反馈';
    console.log(await this.interactiveInput(tips));
  }

  // init 命令实现 - 用于项目初始化
  async init(args) {
    console.log('🐕 Herding - 牧羊犬项目管理工具');
    console.log('正在初始化当前项目...');
    
    const rootPath = getCurrentPath();
    const sleepDogPath = path.join(rootPath, '.sleepdog');
    
    // 检查当前目录是否为空项目
    const files = await fs.readdir(rootPath);
    const projectFiles = files.filter(file => !file.startsWith('.') && file !== 'node_modules');
    
    if (projectFiles.length === 0) {
      console.log('检测到空目录，将初始化为新项目...');
    } else {
      console.log(`检测到现有项目，将为其添加牧羊犬管理功能...`);
    }
    
    // 检查是否已经初始化
    if (existsSync(sleepDogPath)) {
      console.log('⚠️  检测到已存在 .sleepdog 目录');
      console.log('如需重新初始化，请先删除 .sleepdog 目录');
      return;
    }
    
    try {
      await this.initializeSleepdog(rootPath);
      console.log('✅ 初始化完成！');
      console.log('\n📋 接下来的步骤：');
      console.log('1. 运行 herding get-project-info 获取项目信息');
      console.log('2. 运行 get-project-info 获取项目信息（快捷方式）');
      console.log('3. 根据提示完善项目配置');
      console.log('4. 开始使用 AI 协作开发');
    } catch (error) {
      console.error('❌ 初始化失败:', error.message);
      process.exit(1);
    }
  }

  // setup 命令实现 - 用于postinstall脚本
  async setup(args) {
    console.log('🔧 正在设置牧羊犬全局环境...');
    
    try {
      // 复制ask_user_ui.py到全局目录
      await this.copyAskUserUI();
      
      console.log('✅ 全局安装完成！');
      console.log('\n📋 使用方法：');
      console.log('1. 在任何项目目录中运行 herding 初始化项目');
      console.log('2. 运行 herding get-project-info 获取项目信息');
      console.log('3. 运行 get-project-info 获取项目信息（npm bin）');
      console.log('4. 运行 herding ask_user "消息" 进行交互');
      console.log('5. 运行 ask_user "消息" 进行交互（npm bin）');
      console.log('\n🎯 开始在您的项目中使用 AI 协作开发！');
    } catch (error) {
      console.error('❌ 设置失败:', error.message);
      // 不要退出，因为这是postinstall脚本
    }
  }

  // 复制ask_user_ui.py到全局目录
  async copyAskUserUI() {
    const sourceFile = path.join(path.dirname(process.argv[1]), 'ask_user_ui.py');
    const targetFile = path.join(process.env.APPDATA || process.env.HOME, 'npm', 'ask_user_ui.py');
    
    if (existsSync(sourceFile)) {
      try {
        const content = await fs.readFile(sourceFile, 'utf-8');
        await fs.writeFile(targetFile, content);
        console.log('✅ ask_user_ui.py 已复制到全局目录');
      } catch (error) {
        console.warn('⚠️  复制ask_user_ui.py失败:', error.message);
      }
    } else {
      console.warn('⚠️  未找到ask_user_ui.py源文件');
    }
  }

  // 显示版本信息
  async showVersion(args) {
    console.log('🐕 Herding - 牧羊犬项目管理工具');
    console.log('版本: 1.0.0');
    console.log('作者: qinyongliang');
    console.log('描述: 一个专为AI开发协作设计的项目管理工具');
  }

  // 交互式输入处理
  async interactiveInput(tips) {
    // 先检查未完成任务
    const unfinishedTaskInfo = await this.checkUnfinishedTasks();
    
    // 查找ask_user_ui.py文件的位置
    const askUserScript = this.findAskUserScript();
    
    // if (unfinishedTaskInfo)  {
      // 使用spawn方式直接通过stdin传递数据
      const { spawn } = await import('child_process');
      
      return new Promise((resolve, reject) => {
        const child = spawn("python3", [askUserScript, tips]);
        
        let stdout = '';
        let stderr = '';
        
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            resolve(stdout);
          } else {
            reject(new Error(`Process exited with code ${code}: ${stderr}`));
          }
        });
        
        child.on('error', (error) => {
          reject(error);
        });
        
        // 将未完成任务信息写入stdin
        if(unfinishedTaskInfo) {
          child.stdin.write(unfinishedTaskInfo);
        }
        child.stdin.end();
      });
    // }
  }

  // 检查未完成的任务
  async checkUnfinishedTasks() {
    const taskId = `${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '')}-${getPPID()}`;
    const rootPath = getCurrentPath();
    const taskFile = path.join(rootPath, '.sleepdog', 'task', `${taskId}-todo.md`);

    if (!existsSync(taskFile)) {
      return "任务完成"
    }

    const content = await fs.readFile(taskFile, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.includes('[ ]')) {
        return `<next-step>在.sleepdog/task/${taskId}-todo.md找到尚未完成的任务：${line.trim()}。请继续此任务</next-step>`;
      }
    }

    return `<next-step> update .sleepdog/project.md file on the changes you have just done. and stop.</next-step>
<file:project.md>
${await fs.readFile(path.join(rootPath, '.sleepdog', 'project.md'), 'utf-8')}
</file:project.md>
`;
  }

  // 初始化sleepdog
  async initializeSleepdog(rootPath) {
    const sleepDogPath = path.join(rootPath, '.sleepdog');

    try {
      await fs.mkdir(sleepDogPath, { recursive: true });
      // 检查目标目录是否为空
      const files = await fs.readdir(sleepDogPath);
      if (files.length === 0) {
        const { stdout, stderr } = await execPromise(
          `git clone https://gh-proxy.net/https://github.com/qinyongliang/herding.git --branch template ${path.join(
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
        console.log(`Successfully initialized .sleepDog directory with template`);
        console.log(`[Attention]\n
Next step you should do:\n
1. every file in .sleepDog directory is a markdown file, you can read them and update them.
2. you have to follow the instructions in .sleepDog/*.md files and update them.
3. before you finish edit .sleepDog/*.md files, do not use get-project-info.
4. after you finish edit .sleepDog/*.md files, just stop.
`)
      }

      // 生成cursorRule
      await this.generateCursorRule();
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

  

  // 生成cursorRule命令实现
  async generateCursorRule() {
    const rule = generateCursorRule();
    const rootPath = getCurrentPath();
    const ruleDir = path.join(rootPath, '.cursor/rules');
    const ruleFile = path.join(ruleDir, 'SleepDog.mdc');
    
    // 确保目录存在
    await fs.mkdir(ruleDir, { recursive: true });
    await fs.writeFile(ruleFile, rule);
  }





  // 查找ask_user_ui.py文件
  findAskUserScript() {
    const possiblePaths = [
      // 1. 当前项目目录
      path.join(getCurrentPath(), 'ask_user_ui.py'),
      // 2. 全局npm模块目录
      path.join(process.env.APPDATA || process.env.HOME, 'npm', 'node_modules', 'herding', 'ask_user_ui.py'),
      // 3. 全局npm安装目录
      path.join(process.env.APPDATA || process.env.HOME, 'npm', 'ask_user_ui.py'),
      // 4. 脚本所在目录
      path.join(path.dirname(process.argv[1]), 'ask_user_ui.py')
    ];

    for (const scriptPath of possiblePaths) {
      if (existsSync(scriptPath)) {
        return scriptPath;
      }
    }

    // 如果都找不到，返回默认路径并提示用户
    console.warn('⚠️  未找到ask_user_ui.py文件，请确保已正确安装herding工具');
    return possiblePaths[0]; // 返回当前目录作为默认值
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