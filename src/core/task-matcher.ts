import { readdir, readFile } from 'fs/promises';
import path from 'path';

export interface TaskItem {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  estimatedTime: string;
  dependencies: number[];
  completed: boolean;
  completedAt: string | null;
  planFile?: string; // 添加计划文件路径信息
}

export interface TaskPlan {
  title: string;
  userRequirement: string;
  createdAt: string;
  createdBy: string;
  status: string;
  completedAt?: string;
  tasks: TaskItem[];
  planFile?: string; // 添加计划文件路径信息
}

export interface TaskMatchResult {
  task: TaskItem;
  plan: TaskPlan;
  distance: number;
  confidence: 'exact' | 'high' | 'medium' | 'low';
}

/**
 * 计算两个字符串的汉明距离（适用于不同长度字符串的编辑距离）
 */
export function calculateEditDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  // 创建DP表
  const dp: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // 初始化边界条件
  for (let i = 0; i <= len1; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    dp[0][j] = j;
  }

  // 计算编辑距离
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // 删除
          dp[i][j - 1] + 1,     // 插入
          dp[i - 1][j - 1] + 1  // 替换
        );
      }
    }
  }

  return dp[len1][len2];
}

/**
 * 计算字符串相似度分数 (0-1之间，1表示完全相同)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (str1.length === 0 && str2.length === 0) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;

  const distance = calculateEditDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  return 1 - (distance / maxLength);
}

/**
 * 从工作目录加载所有任务计划
 */
export async function loadAllTaskPlans(rootPath: string): Promise<TaskPlan[]> {
  const workingDir = path.join(rootPath, ".herding_working");
  const plans: TaskPlan[] = [];

  try {
    const dates = await readdir(workingDir, { withFileTypes: true });
    const dateDirs = dates
      .filter(dirent => dirent.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(dirent.name))
      .map(dirent => dirent.name)
      .sort()
      .reverse(); // 按时间从新到旧排序

    for (const dateDir of dateDirs) {
      const datePath = path.join(workingDir, dateDir);
      const files = await readdir(datePath);
      const jsonFiles = files
        .filter(file => file.endsWith('.json'))
        .sort()
        .reverse(); // 同一天内也按时间从新到旧

      for (const jsonFile of jsonFiles) {
        try {
          const filePath = path.join(datePath, jsonFile);
          const content = await readFile(filePath, 'utf-8');
          const plan: TaskPlan = JSON.parse(content);
          
          // 添加文件路径信息到计划和任务中
          plan.planFile = filePath;
          plan.tasks.forEach(task => {
            task.planFile = filePath;
          });
          
          plans.push(plan);
        } catch (error) {
          console.warn(`Failed to load plan from ${jsonFile}:`, error);
        }
      }
    }
  } catch (error) {
    console.warn("Failed to load task plans:", error);
  }

  return plans;
}

/**
 * 根据任务名称查找最匹配的任务
 */
export async function findBestMatchingTasks(
  rootPath: string, 
  taskTitle: string, 
  limit: number = 5
): Promise<TaskMatchResult[]> {
  const plans = await loadAllTaskPlans(rootPath);
  const allTasks: TaskMatchResult[] = [];

  // 收集所有任务并计算相似度
  for (const plan of plans) {
    for (const task of plan.tasks) {
      const similarity = calculateSimilarity(taskTitle, task.title);
      const distance = calculateEditDistance(taskTitle.toLowerCase(), task.title.toLowerCase());
      
      let confidence: 'exact' | 'high' | 'medium' | 'low';
      if (similarity >= 0.95) confidence = 'exact';
      else if (similarity >= 0.8) confidence = 'high';
      else if (similarity >= 0.6) confidence = 'medium';
      else confidence = 'low';

      allTasks.push({
        task,
        plan,
        distance,
        confidence
      });
    }
  }

  // 按相似度排序（距离小的在前面）
  allTasks.sort((a, b) => a.distance - b.distance);

  return allTasks.slice(0, limit);
}

/**
 * 根据任务ID查找任务（跨所有计划文件）
 */
export async function findTaskById(
  rootPath: string, 
  taskId: number
): Promise<TaskMatchResult | null> {
  const plans = await loadAllTaskPlans(rootPath);

  // 按时间从新到旧查找
  for (const plan of plans) {
    const task = plan.tasks.find(t => t.id === taskId);
    if (task) {
      return {
        task,
        plan,
        distance: 0,
        confidence: 'exact'
      };
    }
  }

  return null;
}

/**
 * 获取计划的session ID（基于文件名）
 */
export function getPlanSessionId(planFile: string): string {
  const baseName = path.basename(planFile, '.json');
  const dirName = path.basename(path.dirname(planFile));
  return `${dirName}_${baseName}`;
}

/**
 * 根据session ID查找计划文件
 */
export function getPlanFileFromSessionId(rootPath: string, sessionId: string): string {
  const [dateDir, timeFile] = sessionId.split('_');
  return path.join(rootPath, '.herding_working', dateDir, `${timeFile}.json`);
}

/**
 * 生成任务匹配报告
 */
export function generateMatchReport(matches: TaskMatchResult[], searchTerm: string): string {
  if (matches.length === 0) {
    return `❌ 未找到与 "${searchTerm}" 匹配的任务`;
  }

  const exactMatches = matches.filter(m => m.confidence === 'exact');
  const highMatches = matches.filter(m => m.confidence === 'high');
  const mediumMatches = matches.filter(m => m.confidence === 'medium');
  const lowMatches = matches.filter(m => m.confidence === 'low');

  let report = `🔍 任务搜索结果 "${searchTerm}":\n\n`;

  if (exactMatches.length > 0) {
    report += "✅ **精确匹配**:\n";
    exactMatches.forEach((match, index) => {
      report += `${index + 1}. [#${match.task.id}] ${match.task.title}\n`;
      report += `   📂 计划: ${match.plan.title}\n`;
      report += `   📊 状态: ${match.task.completed ? '✅ 已完成' : '⏳ 待完成'}\n\n`;
    });
  }

  if (highMatches.length > 0) {
    report += "🎯 **高相似度匹配**:\n";
    highMatches.forEach((match, index) => {
      report += `${index + 1}. [#${match.task.id}] ${match.task.title}\n`;
      report += `   📂 计划: ${match.plan.title}\n`;
      report += `   📊 状态: ${match.task.completed ? '✅ 已完成' : '⏳ 待完成'}\n`;
      report += `   📏 距离: ${match.distance}\n\n`;
    });
  }

  if (mediumMatches.length > 0 && exactMatches.length === 0 && highMatches.length === 0) {
    report += "🔍 **中等相似度匹配**:\n";
    mediumMatches.slice(0, 3).forEach((match, index) => {
      report += `${index + 1}. [#${match.task.id}] ${match.task.title}\n`;
      report += `   📂 计划: ${match.plan.title}\n`;
      report += `   📊 状态: ${match.task.completed ? '✅ 已完成' : '⏳ 待完成'}\n`;
      report += `   📏 距离: ${match.distance}\n\n`;
    });
  }

  return report;
} 