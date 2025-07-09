#!/usr/bin/env node

/**
 * ask_user - 用户交互工具
 * 用于获取用户反馈和处理交互式输入
 * 
 * @author qinyongliang
 * @date 2025-01-09
 */

import { existsSync, promises as fs } from "fs";
import * as path from "path";
import * as os from "os";

// 系统类型检测
const SYSTEM_TYPE = os.platform();
const IS_WINDOWS = SYSTEM_TYPE === 'win32';
const IS_MAC = SYSTEM_TYPE === 'darwin';
const IS_LINUX = SYSTEM_TYPE === 'linux';

// 获取当前工作目录
const getCurrentPath = () => {
  return process.cwd();
};

// 获取PPID
const getPPID = () => {
  return process.ppid;
};

// 用户交互管理类
class UserInteractionManager {
  constructor() {
    this.rootPath = getCurrentPath();
    this.sleepDogPath = path.join(this.rootPath, '.sleepdog');
  }

  // 主要的ask_user功能
  async askUser(args) {
    const tips = args.join(' ') || '请提供反馈';
    console.log(await this.interactiveInput(tips));
  }

  // 交互式输入处理
  async interactiveInput(tips) {
    // 先检查未完成任务
    const unfinishedTaskInfo = await this.checkUnfinishedTasks();
    
    // 查找ask_user_ui.py文件的位置
    const askUserScript = this.findAskUserScript();
    
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
  }

  // 检查未完成的任务
  async checkUnfinishedTasks() {
    const taskId = `${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '')}-${getPPID()}`;
    const taskFile = path.join(this.sleepDogPath, 'task', `${taskId}-todo.md`);

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
${await fs.readFile(path.join(this.sleepDogPath, 'project.md'), 'utf-8')}
</file:project.md>
`;
  }

  // 查找ask_user_ui.py文件
  findAskUserScript() {
    const possiblePaths = [
      // 1. 当前项目目录
      path.join(this.rootPath, 'ask_user_ui.py'),
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
  try {
    const args = process.argv.slice(2);
    const manager = new UserInteractionManager();
    await manager.askUser(args);
  } catch (error) {
    console.error(`执行ask_user时发生错误: ${error.message}`);
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