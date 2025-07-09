#!/usr/bin/env node

/**
 * common - 公共工具模块
 * 包含项目中的公共函数、常量和工具类
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

// ==================== 常量配置 ====================

// 系统类型检测
export const SYSTEM_TYPE = os.platform();
export const IS_WINDOWS = SYSTEM_TYPE === 'win32';
export const IS_MAC = SYSTEM_TYPE === 'darwin';
export const IS_LINUX = SYSTEM_TYPE === 'linux';

// 路径常量
export const SLEEPDOG_DIR = '.sleepdog';
export const TASK_DIR = 'task';
export const TEMPLATES_DIR = 'templates';
export const CURSOR_RULES_DIR = '.cursor/rules';
export const ASK_USER_SCRIPT = 'ask_user_ui.py';

// 文件名常量
export const PROJECT_FILE = 'project.md';
export const TODO_TEMPLATE = '_todo.md';
export const CURSOR_RULE_FILE = 'SleepDog.mdc';

// 格式化常量
export const TREE_INDENT = "    ";
export const DATE_FORMAT_OPTIONS = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
};
export const TIME_FORMAT_OPTIONS = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
};

// 黑名单配置
export const FOLDER_BLACKLIST = [
  "node_modules",
  SLEEPDOG_DIR,
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

export const FORCE_BLACKLIST = [".git", SLEEPDOG_DIR, ".vscode", ".idea"];

// 任务状态常量
export const TASK_STATUS = {
  PENDING: '[ ]',
  COMPLETED: '[x]',
  IN_PROGRESS: '[-]'
};

// 消息常量
export const MESSAGES = {
  TASK_COMPLETE: '任务完成。最后请更新 .sleepdog/project.md 文件，记录您刚才完成的更改。',
  DEFAULT_TIPS: '请提供反馈',
  SCRIPT_NOT_FOUND: '⚠️  未找到ask_user_ui.py文件，请确保已正确安装herding工具',
  INIT_SUCCESS: 'Successfully initialized .sleepDog directory with template'
};

// ==================== 公共工具函数 ====================

/**
 * 获取当前工作目录
 */
export const getCurrentPath = () => {
  return process.cwd();
};

/**
 * 获取父进程ID
 */
export const getPPID = () => {
  return process.ppid;
};

/**
 * 获取当前时间字符串
 */
export const getCurrentTime = () => {
  return new Date().toLocaleString('zh-CN', TIME_FORMAT_OPTIONS);
};

/**
 * 获取当前日期字符串（用于任务ID）
 */
export const getCurrentDate = () => {
  return new Date().toLocaleDateString('zh-CN', DATE_FORMAT_OPTIONS).replace(/\//g, '');
};

/**
 * 生成任务ID
 */
export const generateTaskId = () => {
  return `${getCurrentDate()}-${getPPID()}`;
};

/**
 * 获取Git用户名
 */
export const getGitUserName = async () => {
  try {
    const { stdout } = await execPromise('git config user.name');
    return stdout.trim();
  } catch (error) {
    return 'unknown';
  }
};

/**
 * 获取项目根路径
 */
export const getProjectRoot = () => {
  return getCurrentPath();
};

/**
 * 获取sleepdog目录路径
 */
export const getSleepDogPath = () => {
  return path.join(getProjectRoot(), SLEEPDOG_DIR);
};

/**
 * 获取任务目录路径
 */
export const getTaskDirPath = () => {
  return path.join(getSleepDogPath(), TASK_DIR);
};

/**
 * 获取任务文件路径
 */
export const getTaskFilePath = (taskId = null) => {
  const id = taskId || generateTaskId();
  return path.join(getTaskDirPath(), `${id}-todo.md`);
};

/**
 * 获取相对任务文件路径
 */
export const getRelativeTaskFilePath = (taskId = null) => {
  const id = taskId || generateTaskId();
  return path.join(SLEEPDOG_DIR, TASK_DIR, `${id}-todo.md`);
};

/**
 * 查找ask_user_ui.py文件
 */
export const findAskUserScript = () => {
  const rootPath = getProjectRoot();
  const possiblePaths = [
    // 1. 当前项目目录
    path.join(rootPath, ASK_USER_SCRIPT),
    // 2. 全局npm模块目录
    path.join(process.env.APPDATA || process.env.HOME, 'npm', 'node_modules', 'herding', ASK_USER_SCRIPT),
    // 3. 全局npm安装目录
    path.join(process.env.APPDATA || process.env.HOME, 'npm', ASK_USER_SCRIPT),
    // 4. 脚本所在目录
    path.join(path.dirname(process.argv[1]), ASK_USER_SCRIPT)
  ];

  for (const scriptPath of possiblePaths) {
    if (existsSync(scriptPath)) {
      return scriptPath;
    }
  }

  // 如果都找不到，返回默认路径并提示用户
  console.warn(MESSAGES.SCRIPT_NOT_FOUND);
  return possiblePaths[0]; // 返回当前目录作为默认值
};

/**
 * 检查文件是否存在
 */
export const fileExists = (filePath) => {
  return existsSync(filePath);
};

/**
 * 确保目录存在
 */
export const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

/**
 * 读取文件内容
 */
export const readFile = async (filePath) => {
  return await fs.readFile(filePath, 'utf-8');
};

/**
 * 写入文件内容
 */
export const writeFile = async (filePath, content) => {
  await fs.writeFile(filePath, content);
};

/**
 * 追加文件内容
 */
export const appendFile = async (filePath, content) => {
  await fs.appendFile(filePath, content);
};

// ==================== 错误处理 ====================

/**
 * 设置全局错误处理
 */
export const setupErrorHandling = () => {
  process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error.message);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
    process.exit(1);
  });
};

/**
 * 错误处理包装器
 */
export const withErrorHandling = (fn) => {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (error) {
      console.error(`执行时发生错误: ${error.message}`);
      process.exit(1);
    }
  };
};

// ==================== 格式化工具 ====================

/**
 * 格式化文件内容为输出格式
 */
export const formatFileContent = (fileName, content) => {
  return `<file:${fileName}>\n${content}\n</file:${fileName}>`;
};

/**
 * 格式化上下文信息
 */
export const formatContext = async () => {
  const gitUserName = await getGitUserName();
  const currentTime = getCurrentTime();
  return `
<context>
${JSON.stringify({
    userName: gitUserName,
    currentTime: currentTime
  }, null, 2)}
</context>
`;
};

/**
 * 格式化下一步提示
 */
export const formatNextStep = (message) => {
  return `<next-step>${message}</next-step>`;
}; 