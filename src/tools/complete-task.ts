import { readdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { calculateEditDistance } from '../core/task-matcher.js';

interface CompleteTaskParams {
  rootPath: string;
  taskId?: number;
  taskTitle?: string;
}

interface TaskItem {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  estimatedTime: string;
  dependencies: number[];
  completed: boolean;
  completedAt: string | null;
}

interface TaskPlan {
  title: string;
  userRequirement: string;
  goal: string;
  createdAt: string;
  createdBy: string;
  status: string;
  completedAt?: string;
  tasks: TaskItem[];
  sessionId: string;
}

/**
 * 完成任务并推荐下一个任务
 */
export async function handleCompleteTask(params: CompleteTaskParams): Promise<any> {
  try {
    console.log(`🎯 开始任务完成处理: ${JSON.stringify(params)}`);

    // 1. 查找任务计划文件
    const planFiles = await findTaskPlanFiles(params.rootPath);
    
    if (planFiles.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `📋 未找到任务计划文件

🔍 请确认：
1. 是否已经使用 \`plan\` 命令创建了任务计划？
2. .herding_working 目录是否存在？
3. 是否有可执行的任务？

💡 如果还没有任务计划，请先使用 \`plan\` 命令创建一个。`,
          },
        ],
      };
    }

    // 2. 查找匹配的任务
    const taskMatch = await findMatchingTask(planFiles, params);
    
    if (!taskMatch) {
      return {
        content: [
          {
            type: "text",
            text: `❌ 未找到匹配的任务

🔍 搜索条件：
${params.taskId ? `- 任务ID: ${params.taskId}` : ''}
${params.taskTitle ? `- 任务标题: "${params.taskTitle}"` : ''}

💡 建议：
1. 使用 \`get-project-info\` 查看当前项目状态
2. 检查任务计划文件是否存在
3. 确认任务ID或标题是否正确`,
          },
        ],
      };
    }

    // 3. 标记任务完成
    const completionResult = await markTaskComplete(taskMatch);
    
    // 4. 查找下一个任务
    const nextTask = await findNextTask(taskMatch.plan);
    
    // 5. 生成完成报告
    const report = generateCompletionReport(taskMatch, nextTask, completionResult);
    
    return {
      content: [
        {
          type: "text",
          text: report,
        },
      ],
      taskInfo: {
        completedTask: taskMatch.task,
        nextTask: nextTask,
        plan: taskMatch.plan,
        completionTime: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error("任务完成处理失败:", error);
    return {
      content: [
        {
          type: "text",
          text: `❌ 任务完成处理失败: ${
            error instanceof Error ? error.message : String(error)
          }

💡 可能的原因：
1. 任务计划文件损坏
2. 文件系统权限问题
3. 任务匹配算法失败

🔧 建议操作：
1. 检查 .herding_working 目录权限
2. 使用 \`update-project-info\` 检查项目状态
3. 重新创建任务计划（如果需要）`,
        },
      ],
    };
  }
}

/**
 * 查找任务计划文件
 */
async function findTaskPlanFiles(rootPath: string): Promise<string[]> {
  const workingDir = path.join(rootPath, '.herding_working');
  const planFiles: string[] = [];
  
  try {
    const entries = await readdir(workingDir, { withFileTypes: true });
    
    // 按时间从新到旧查找计划文件
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dateDir = path.join(workingDir, entry.name);
        try {
          const planFileEntries = await readdir(dateDir);
          for (const planFile of planFileEntries) {
            if (planFile.endsWith('.json')) {
              planFiles.push(path.join(dateDir, planFile));
            }
          }
        } catch {
          // 忽略无法访问的目录
        }
      }
    }
    
    // 按文件修改时间排序（从新到旧）
    planFiles.sort((a, b) => {
      const aTime = path.basename(a).replace('.json', '');
      const bTime = path.basename(b).replace('.json', '');
      return bTime.localeCompare(aTime);
    });
    
    console.log(`📂 找到 ${planFiles.length} 个任务计划文件`);
    return planFiles;
  } catch (error) {
    console.warn("查找任务计划文件失败:", error);
    return [];
  }
}

/**
 * 查找匹配的任务
 */
async function findMatchingTask(planFiles: string[], params: CompleteTaskParams): Promise<{
  task: TaskItem;
  plan: TaskPlan;
  planFile: string;
} | null> {
  
  for (const planFile of planFiles) {
    try {
      const planContent = await readFile(planFile, 'utf-8');
      const plan: TaskPlan = JSON.parse(planContent);
      
      // 通过ID匹配
      if (params.taskId) {
        const task = plan.tasks.find(t => t.id === params.taskId);
        if (task) {
          console.log(`✅ 通过ID匹配到任务: ${task.title}`);
          return { task, plan, planFile };
        }
      }
      
      // 通过标题匹配（使用汉明距离）
      if (params.taskTitle) {
        const matches = plan.tasks.map(task => ({
          task,
          distance: calculateEditDistance(task.title, params.taskTitle!)
        }));
        
        // 按距离排序，选择最接近的
        matches.sort((a, b) => a.distance - b.distance);
        
        if (matches.length > 0 && matches[0].distance <= 3) {
          console.log(`✅ 通过标题匹配到任务: ${matches[0].task.title} (距离: ${matches[0].distance})`);
          return { task: matches[0].task, plan, planFile };
        }
        
        // 如果没有精确匹配，提供建议
        if (matches.length > 0) {
          console.log(`💡 找到相似任务，但距离较大: ${matches[0].task.title} (距离: ${matches[0].distance})`);
        }
      }
      
      // 如果没有指定具体任务，返回第一个未完成的任务
      if (!params.taskId && !params.taskTitle) {
        const pendingTask = plan.tasks.find(t => !t.completed);
        if (pendingTask) {
          console.log(`✅ 找到下一个未完成任务: ${pendingTask.title}`);
          return { task: pendingTask, plan, planFile };
        }
      }
    } catch (error) {
      console.warn(`解析计划文件失败: ${planFile}`, error);
    }
  }
  
  return null;
}

/**
 * 标记任务完成
 */
async function markTaskComplete(taskMatch: {
  task: TaskItem;
  plan: TaskPlan;
  planFile: string;
}): Promise<any> {
  try {
    const { task, plan, planFile } = taskMatch;
    
    // 更新任务状态
    task.completed = true;
    task.completedAt = new Date().toISOString();
    task.status = 'completed';
    
    // 保存更新后的计划
    await writeFile(planFile, JSON.stringify(plan, null, 2), 'utf-8');
    
    console.log(`✅ 任务已标记为完成: ${task.title}`);
    
    return {
      success: true,
      completedAt: task.completedAt,
      updatedPlanFile: planFile
    };
  } catch (error) {
    console.error("标记任务完成失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 查找下一个任务
 */
async function findNextTask(plan: TaskPlan): Promise<TaskItem | null> {
  // 查找下一个未完成的任务
  const pendingTasks = plan.tasks.filter(t => !t.completed);
  
  if (pendingTasks.length === 0) {
    return null;
  }
  
  // 优先选择没有依赖关系的任务
  const readyTasks = pendingTasks.filter(task => {
    return task.dependencies.every(depId => {
      const depTask = plan.tasks.find(t => t.id === depId);
      return depTask?.completed === true;
    });
  });
  
  if (readyTasks.length > 0) {
    // 按优先级排序
    readyTasks.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return priorityOrder[b.priority as keyof typeof priorityOrder] - 
             priorityOrder[a.priority as keyof typeof priorityOrder];
    });
    
    return readyTasks[0];
  }
  
  // 如果没有准备好的任务，返回第一个待处理任务
  return pendingTasks[0];
}

/**
 * 生成完成报告
 */
function generateCompletionReport(
  taskMatch: { task: TaskItem; plan: TaskPlan; planFile: string },
  nextTask: TaskItem | null,
  completionResult: any
): string {
  const { task, plan } = taskMatch;
  const completedCount = plan.tasks.filter(t => t.completed).length;
  const totalCount = plan.tasks.length;
  const progress = Math.round((completedCount / totalCount) * 100);
  
  let report = `✅ 任务完成！

📋 **已完成任务**:
- 任务ID: #${task.id}
- 任务标题: ${task.title}
- 描述: ${task.description}
- 优先级: ${task.priority}
- 完成时间: ${new Date(task.completedAt!).toLocaleString()}

📊 **项目进度**:
- 完成进度: ${completedCount}/${totalCount} (${progress}%)
- 计划目标: ${plan.goal}
- 计划标题: ${plan.title}

🎯 **目标提醒**: ${plan.goal}
这是您当前任务的核心目标，请在后续任务中保持关注。
`;

  if (nextTask) {
    report += `
🔄 **下一个建议任务**:
- 任务ID: #${nextTask.id}
- 任务标题: ${nextTask.title}
- 描述: ${nextTask.description}
- 优先级: ${nextTask.priority}
- 预估时间: ${nextTask.estimatedTime}

💡 **执行建议**:
1. 继续关注项目目标: "${plan.goal}"
2. 按照任务描述进行实施
3. 完成后使用 \`complete-task\` 命令标记完成

🚀 **开始下一个任务**: 
\`complete-task --task-id ${nextTask.id}\``;
  } else {
    report += `
🎉 **计划完成**:
恭喜！您已经完成了所有任务。

🏆 **成就达成**:
- ✅ 所有任务已完成
- 🎯 项目目标已达成
- 📊 完成率: 100%

📋 **总结回顾**:
- 计划目标: ${plan.goal}
- 任务总数: ${totalCount}
- 总耗时: ${plan.tasks.map(t => t.estimatedTime).join(', ')}

🔄 **下一步建议**:
1. 使用 \`update-project-info\` 更新项目状态
2. 创建新的任务计划（如果需要）
3. 进行项目总结和文档整理`;
  }
  
  return report;
} 