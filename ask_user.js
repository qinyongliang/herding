#!/usr/bin/env node

/**
 * ask_user - 用户交互工具
 * 用于获取用户反馈和处理交互式输入
 * 
 * @author qinyongliang
 * @date 2025-01-09
 */

import { spawn } from 'child_process';
import * as path from "path";
import {
  generateTaskId,
  getTaskFilePath,
  getRelativeTaskFilePath,
  getSleepDogPath,
  findAskUserScript,
  fileExists,
  readFile,
  setupErrorHandling,
  withErrorHandling,
  formatFileContent,
  MESSAGES,
  TASK_STATUS,
  TASK_DIR,
  PROJECT_FILE
} from './common.js';

// 用户交互管理类
class UserInteractionManager {
  constructor() {
    this.sleepDogPath = getSleepDogPath();
  }

  // 主要的ask_user功能
  async askUser(args) {
    const tips = args.join(' ') || MESSAGES.DEFAULT_TIPS;
    console.log(await this.interactiveInput(tips));
  }

  // 交互式输入处理
  async interactiveInput(tips) {
    // 先检查未完成任务
    const unfinishedTaskInfo = await this.checkUnfinishedTasks();
    
    // 查找ask_user_ui.py文件的位置
    const askUserScript = findAskUserScript();
    
    // 使用spawn方式直接通过stdin传递数据
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
    const taskId = generateTaskId();
    const taskFile = getTaskFilePath(taskId);
    const relativeTaskFile = getRelativeTaskFilePath(taskId);

    if (!fileExists(taskFile)) {
      return MESSAGES.TASK_COMPLETE;
    }

    const content = await readFile(taskFile);
    const lines = content.split('\n');

    // 查找未完成的任务
    for (const line of lines) {
      if (line.includes(TASK_STATUS.PENDING)) {
        return `<next-step>在${relativeTaskFile}找到尚未完成的任务：${line.trim()}。请继续此任务</next-step>`;
      }
    }

    // 所有任务都完成了，提示更新项目文件
    const projectFile = path.join(this.sleepDogPath, PROJECT_FILE);
    const projectContent = await readFile(projectFile);
    
    return `<next-step> update ${path.join('.sleepdog', PROJECT_FILE)} file on the changes you have just done. and stop.</next-step>
${formatFileContent(PROJECT_FILE, projectContent)}`;
  }
}

// 主函数
const main = withErrorHandling(async () => {
  const args = process.argv.slice(2);
  const manager = new UserInteractionManager();
  await manager.askUser(args);
});

// 设置错误处理
setupErrorHandling();

// 运行主函数
main(); 