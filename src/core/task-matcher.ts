/**
 * 任务匹配算法模块
 * 用于智能匹配任务名称，支持汉明距离算法
 * 
 * @author qinyongliang
 * @created 2025-07-02
 */

import * as fs from 'fs';
import * as path from 'path';

// 任务项接口
export interface TaskItem {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  estimated_time: string;
  dependencies: number[];
  completed: boolean;
  completed_at?: string;
}

// 任务计划接口
export interface TaskPlan {
  title: string;
  user_requirement: string;
  goal: string;
  created_at: string;
  created_by: string;
  status: string;
  completed_at?: string;
  tasks: TaskItem[];
  session_id: string;
}

// 匹配结果接口
export interface MatchResult {
  task: TaskItem;
  plan: TaskPlan;
  distance: number;
  similarity: number;
  file_path: string;
}

/**
 * 计算汉明距离
 * @param str1 字符串1
 * @param str2 字符串2
 * @returns 汉明距离
 */
export function calculateHammingDistance(str1: string, str2: string): number {
  // 预处理：统一转换为小写，移除空格和特殊字符
  const clean1 = str1.toLowerCase().replace(/[^\w\u4e00-\u9fa5]/g, '');
  const clean2 = str2.toLowerCase().replace(/[^\w\u4e00-\u9fa5]/g, '');
  
  // 如果长度不同，先计算长度差异
  const maxLen = Math.max(clean1.length, clean2.length);
  const lengthDiff = Math.abs(clean1.length - clean2.length);
  
  // 计算字符差异
  let charDiff = 0;
  const minLen = Math.min(clean1.length, clean2.length);
  
  for (let i = 0; i < minLen; i++) {
    if (clean1[i] !== clean2[i]) {
      charDiff++;
    }
  }
  
  // 总距离 = 字符差异 + 长度差异
  return charDiff + lengthDiff;
}

/**
 * 计算相似度（0-1之间，1表示完全相似）
 * @param str1 字符串1
 * @param str2 字符串2
 * @returns 相似度
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const distance = calculateHammingDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  
  if (maxLen === 0) return 1;
  
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * 获取所有任务计划文件
 * @param workingDir 工作目录
 * @returns 任务计划文件路径数组
 */
export function getAllPlanFiles(workingDir: string): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(workingDir)) {
    return files;
  }
  
  try {
    // 遍历日期目录
    const dateEntries = fs.readdirSync(workingDir, { withFileTypes: true });
    
    for (const dateEntry of dateEntries) {
      if (dateEntry.isDirectory()) {
        const datePath = path.join(workingDir, dateEntry.name);
                 const planFiles = fs.readdirSync(datePath)
           .filter((file: string) => file.endsWith('.json'))
           .map((file: string) => path.join(datePath, file));
        
        files.push(...planFiles);
      }
    }
    
    // 按修改时间排序（新的在前）
    files.sort((a, b) => {
      const statA = fs.statSync(a);
      const statB = fs.statSync(b);
      return statB.mtime.getTime() - statA.mtime.getTime();
    });
    
  } catch (error) {
    console.error('读取任务计划文件失败:', error);
  }
  
  return files;
}

/**
 * 加载任务计划
 * @param filePath 文件路径
 * @returns 任务计划对象或null
 */
export function loadTaskPlan(filePath: string): TaskPlan | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const plan: TaskPlan = JSON.parse(content);
    return plan;
  } catch (error) {
    console.error(`加载任务计划失败: ${filePath}`, error);
    return null;
  }
}

/**
 * 查找匹配的任务
 * @param taskName 任务名称
 * @param workingDir 工作目录
 * @param maxResults 最大返回结果数
 * @returns 匹配结果数组
 */
export function findMatchingTasks(
  taskName: string,
  workingDir: string,
  maxResults: number = 10
): MatchResult[] {
  const results: MatchResult[] = [];
  const planFiles = getAllPlanFiles(workingDir);
  
  console.log(`开始查找任务: "${taskName}", 在 ${planFiles.length} 个计划文件中`);
  
  for (const filePath of planFiles) {
    const plan = loadTaskPlan(filePath);
    if (!plan) continue;
    
    for (const task of plan.tasks) {
      const distance = calculateHammingDistance(taskName, task.title);
      const similarity = calculateSimilarity(taskName, task.title);
      
      results.push({
        task,
        plan,
        distance,
        similarity,
        file_path: filePath
      });
    }
  }
  
  // 按相似度排序（高相似度在前）
  results.sort((a, b) => b.similarity - a.similarity);
  
  // 返回前N个结果
  return results.slice(0, maxResults);
}

/**
 * 查找最佳匹配的任务
 * @param taskName 任务名称
 * @param workingDir 工作目录
 * @param similarityThreshold 相似度阈值
 * @returns 最佳匹配结果或null
 */
export function findBestMatchingTask(
  taskName: string,
  workingDir: string,
  similarityThreshold: number = 0.5
): MatchResult | null {
  const results = findMatchingTasks(taskName, workingDir, 1);
  
  if (results.length === 0) {
    console.log(`未找到任何匹配的任务: "${taskName}"`);
    return null;
  }
  
  const bestMatch = results[0];
  
  if (bestMatch.similarity < similarityThreshold) {
    console.log(`最佳匹配任务相似度过低: ${bestMatch.similarity.toFixed(2)}, 阈值: ${similarityThreshold}`);
    return null;
  }
  
  console.log(`找到最佳匹配任务: "${bestMatch.task.title}", 相似度: ${bestMatch.similarity.toFixed(2)}`);
  return bestMatch;
}

/**
 * 完成任务并返回下一个任务
 * @param taskName 任务名称
 * @param workingDir 工作目录
 * @returns 完成结果和下一个任务信息
 */
export function completeTaskAndGetNext(
  taskName: string,
  workingDir: string
): {
  success: boolean;
  message: string;
  completedTask?: TaskItem;
     nextTask?: TaskItem | null;
  suggestions?: string[];
} {
  const bestMatch = findBestMatchingTask(taskName, workingDir, 0.3);
  
  if (!bestMatch) {
    // 提供建议
    const suggestions = findMatchingTasks(taskName, workingDir, 5)
      .map(result => `${result.task.title} (相似度: ${(result.similarity * 100).toFixed(1)}%)`)
      .slice(0, 3);
    
    return {
      success: false,
      message: `未找到匹配的任务: "${taskName}"`,
      suggestions
    };
  }
  
  // 标记任务为完成
  bestMatch.task.completed = true;
  bestMatch.task.completed_at = new Date().toISOString();
  bestMatch.task.status = 'completed';
  
  // 保存更新后的计划
  try {
    const updatedContent = JSON.stringify(bestMatch.plan, null, 2);
    fs.writeFileSync(bestMatch.file_path, updatedContent);
    
    console.log(`任务已完成: "${bestMatch.task.title}"`);
    
    // 查找下一个未完成的任务
    const nextTask = findNextTask(bestMatch.plan);
    
    return {
      success: true,
      message: `任务已完成: "${bestMatch.task.title}"`,
      completedTask: bestMatch.task,
      nextTask
    };
    
  } catch (error) {
    console.error('保存任务计划失败:', error);
    return {
      success: false,
      message: `保存任务计划失败: ${error}`
    };
  }
}

/**
 * 查找下一个未完成的任务
 * @param plan 任务计划
 * @returns 下一个任务或null
 */
export function findNextTask(plan: TaskPlan): TaskItem | null {
  // 查找所有未完成的任务
  const incompleteTasks = plan.tasks.filter(task => !task.completed);
  
  if (incompleteTasks.length === 0) {
    console.log('所有任务都已完成！');
    return null;
  }
  
     // 按优先级和依赖关系排序
   const priorityOrder: { [key: string]: number } = { 'high': 3, 'medium': 2, 'low': 1 };
   const completedTaskIds = new Set(plan.tasks.filter(t => t.completed).map(t => t.id));
   
   // 查找可执行的任务（依赖已完成）
   const executableTasks = incompleteTasks.filter(task => {
     return task.dependencies.every(depId => completedTaskIds.has(depId));
   });
   
   if (executableTasks.length === 0) {
     // 如果没有可执行的任务，返回第一个未完成任务
     return incompleteTasks[0];
   }
   
   // 按优先级排序
   executableTasks.sort((a, b) => {
     const priorityA = priorityOrder[a.priority] || 0;
     const priorityB = priorityOrder[b.priority] || 0;
     return priorityB - priorityA;
   });
  
     console.log(`找到下一个任务: "${executableTasks[0].title}"`);
   return executableTasks[0];
 }

/**
 * 从计划文件路径获取session ID
 * @param planFile 计划文件路径
 * @returns session ID
 */
export function getPlanSessionId(planFile: string): string {
  const baseName = path.basename(planFile, '.json');
  const dirName = path.basename(path.dirname(planFile));
  return `${dirName}_${baseName}`;
} 