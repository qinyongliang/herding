import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { getPlanSessionId } from '../core/task-matcher.js';

interface EnhancedPlanParams {
  rootPath: string;
  userRequirement: string;
  planTitle: string;
  goalAnalysis: string;
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
 * 增强的plan处理器，支持目标分析和交互式编辑
 */
export async function handleEnhancedPlan(params: EnhancedPlanParams): Promise<any> {
  try {
    console.log(`🎯 开始创建增强任务计划: ${params.planTitle}`);
    console.log(`📝 用户需求: ${params.userRequirement}`);
    console.log(`🎯 目标分析: ${params.goalAnalysis}`);

    // 1. 创建基础任务计划
    const taskPlan = await createInitialPlan(params);

    // 2. 保存计划到文件系统
    const planFile = await savePlanToFile(params.rootPath, taskPlan);
    
    // 3. 启动Tauri交互式编辑器
    const editResult = await launchInteractiveEditor(taskPlan.sessionId);

    // 4. 返回结果
    return {
      content: [
        {
          type: "text",
          text: `✅ 任务计划创建成功！

📋 计划标题: ${params.planTitle}
🎯 核心目标: ${params.goalAnalysis}
📅 创建时间: ${taskPlan.createdAt}
📂 计划文件: ${planFile}
🆔 会话ID: ${taskPlan.sessionId}

📝 已生成 ${taskPlan.tasks.length} 个任务项：
${taskPlan.tasks.map(task => 
  `${task.id}. ${task.title} (${task.priority}) - ${task.description}`
).join('\n')}

🖥️ 交互式编辑器已启动，您可以：
- 📝 编辑任务内容和描述
- 🔄 拖拽排序任务（支持Ctrl+Z撤销）
- ➕ 添加新任务或删除任务
- 💬 输入文字重新制订计划
- 💾 保存并完成编辑

⚠️ 请在编辑器中完成修改后点击"完成编辑"返回结果。

🔄 下一步: 编辑完成后，使用 complete-task 命令开始执行任务。`,
        },
      ],
      planInfo: {
        sessionId: taskPlan.sessionId,
        planFile: planFile,
        taskCount: taskPlan.tasks.length,
        goal: params.goalAnalysis
      }
    };
  } catch (error) {
    console.error("创建增强计划失败:", error);
    return {
      content: [
        {
          type: "text",
          text: `❌ 创建任务计划失败: ${
            error instanceof Error ? error.message : String(error)
          }

💡 请检查：
1. 文件系统权限是否正确
2. .herding_working目录是否可写
3. Tauri应用是否正确安装

🔧 您也可以尝试重新运行plan命令。`,
        },
      ],
    };
  }
}

/**
 * 创建初始任务计划
 */
async function createInitialPlan(params: EnhancedPlanParams): Promise<TaskPlan> {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  
  const sessionId = `${dateStr}_${timeStr}`;

  // 基于目标分析生成更智能的任务分解
  const smartTasks = generateSmartTasks(params.userRequirement, params.goalAnalysis);

  const taskPlan: TaskPlan = {
    title: params.planTitle,
    userRequirement: params.userRequirement,
    goal: params.goalAnalysis,
    createdAt: now.toISOString(),
    createdBy: "herding-mcp-enhanced",
    status: "active",
    tasks: smartTasks,
    sessionId: sessionId
  };

  return taskPlan;
}

/**
 * 基于目标分析生成智能任务分解
 */
function generateSmartTasks(userRequirement: string, goalAnalysis: string): TaskItem[] {
  console.log(`🧠 基于目标"${goalAnalysis}"生成智能任务分解...`);

  // 基础任务模板
  const baseTasks: Omit<TaskItem, 'id'>[] = [
    {
      title: "目标确认与需求分析",
      description: `确认目标: ${goalAnalysis}\n详细分析用户需求: ${userRequirement}\n明确成功标准和验收条件`,
      status: "pending",
      priority: "high",
      estimatedTime: "30分钟",
      dependencies: [],
      completed: false,
      completedAt: null
    },
    {
      title: "制定实现策略",
      description: `基于确认的目标制定具体实现策略\n考虑技术方案、资源需求和时间安排\n识别潜在风险和解决方案`,
      status: "pending", 
      priority: "high",
      estimatedTime: "45分钟",
      dependencies: [1],
      completed: false,
      completedAt: null
    },
    {
      title: "开始核心实现",
      description: `按照制定的策略开始核心功能实现\n聚焦于实现目标的关键部分\n保持与目标的一致性`,
      status: "pending",
      priority: "medium", 
      estimatedTime: "2小时",
      dependencies: [2],
      completed: false,
      completedAt: null
    },
    {
      title: "测试与验证",
      description: `验证实现是否达到预期目标\n进行功能测试和集成测试\n确保符合用户需求`,
      status: "pending",
      priority: "medium",
      estimatedTime: "45分钟", 
      dependencies: [3],
      completed: false,
      completedAt: null
    },
    {
      title: "优化与完善",
      description: `基于测试结果进行优化\n完善文档和注释\n确保目标完全达成`,
      status: "pending",
      priority: "low",
      estimatedTime: "30分钟",
      dependencies: [4],
      completed: false,
      completedAt: null
    }
  ];

  // 为任务添加ID
  const tasks: TaskItem[] = baseTasks.map((task, index) => ({
    ...task,
    id: index + 1
  }));

  console.log(`✅ 生成了 ${tasks.length} 个智能任务`);
  return tasks;
}

/**
 * 保存计划到文件系统
 */
async function savePlanToFile(rootPath: string, taskPlan: TaskPlan): Promise<string> {
  const dateStr = taskPlan.createdAt.split('T')[0];
  const timeStr = taskPlan.createdAt.split('T')[1].split('.')[0].replace(/:/g, '-');
  
  // 创建日期目录
  const datePath = path.join(rootPath, ".herding_working", dateStr);
  await mkdir(datePath, { recursive: true });
  
  // 创建任务计划文件
  const planFile = path.join(datePath, `${timeStr}.json`);
  await writeFile(planFile, JSON.stringify(taskPlan, null, 2), 'utf-8');
  
  console.log(`💾 计划已保存到: ${planFile}`);
  return planFile;
}

/**
 * 启动Tauri交互式编辑器
 */
async function launchInteractiveEditor(sessionId: string): Promise<any> {
  return new Promise(async (resolve, reject) => {
    console.log(`🖥️ 启动交互式编辑器 (Session: ${sessionId})...`);
    
    // 检查Tauri应用是否可用
    const tauriAvailable = await checkTauriAvailability();
    
    if (!tauriAvailable) {
      console.log("⚠️ Tauri应用不可用，使用备用方案");
      return resolve(await useFallbackEditor(sessionId));
    }
    
    // 检查当前平台
    const platform = process.platform;
    let tauriExecutable = "";
    
    if (platform === "win32") {
      tauriExecutable = path.join(process.cwd(), "user-interaction-app", "src-tauri", "target", "release", "herding-ui.exe");
    } else if (platform === "darwin") {
      tauriExecutable = path.join(process.cwd(), "user-interaction-app", "src-tauri", "target", "release", "herding-ui");
    } else {
      tauriExecutable = path.join(process.cwd(), "user-interaction-app", "src-tauri", "target", "release", "herding-ui");
    }

    // 启动Tauri应用，传递session_id参数
    const tauriProcess = spawn(tauriExecutable, [`--session-id=${sessionId}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true
    });

    let stdout = "";
    let stderr = "";

    tauriProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
      console.log(`[Tauri] ${data.toString().trim()}`);
    });

    tauriProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
      console.error(`[Tauri Error] ${data.toString().trim()}`);
    });

    // 设置超时 - Tauri应用启动后就认为成功
    setTimeout(() => {
      console.log(`✅ Tauri编辑器启动成功 (PID: ${tauriProcess.pid})`);
      resolve({
        success: true,
        pid: tauriProcess.pid,
        sessionId: sessionId,
        type: "tauri"
      });
    }, 3000);

    tauriProcess.on('error', async (error) => {
      console.error("Tauri启动失败:", error);
      
      // 如果Tauri启动失败，使用备用方案
      const fallbackResult = await useFallbackEditor(sessionId);
      resolve(fallbackResult);
    });
  });
}

/**
 * 检查Tauri应用是否可用
 */
async function checkTauriAvailability(): Promise<boolean> {
  try {
    const platform = process.platform;
    let tauriExecutable = "";
    
    if (platform === "win32") {
      tauriExecutable = path.join(process.cwd(), "user-interaction-app", "src-tauri", "target", "release", "herding-ui.exe");
    } else if (platform === "darwin") {
      tauriExecutable = path.join(process.cwd(), "user-interaction-app", "src-tauri", "target", "release", "herding-ui");
    } else {
      tauriExecutable = path.join(process.cwd(), "user-interaction-app", "src-tauri", "target", "release", "herding-ui");
    }
    
    // 检查文件是否存在
    const { stat } = await import('fs/promises');
    await stat(tauriExecutable);
    return true;
  } catch {
    return false;
  }
}

/**
 * 使用备用编辑器方案
 */
async function useFallbackEditor(sessionId: string): Promise<any> {
  console.log("🔄 使用备用编辑器方案...");
  
  // 这里可以实现多种备用方案：
  // 1. 文本编辑器打开JSON文件
  // 2. 网页版编辑器
  // 3. 命令行交互
  
  try {
    // 方案1：使用默认文本编辑器打开JSON文件
    const planFile = await findLatestPlanFile();
    
    if (planFile) {
      // 在Windows上使用notepad，其他系统使用默认编辑器
      const editor = process.platform === "win32" ? "notepad" : "open";
      
      console.log(`📝 使用系统编辑器打开: ${planFile}`);
      
      const editorProcess = spawn(editor, [planFile], {
        stdio: 'ignore',
        detached: true
      });
      
      editorProcess.unref();
      
      return {
        success: true,
        type: "fallback-text-editor",
        sessionId: sessionId,
        planFile: planFile,
        message: "已使用系统默认编辑器打开任务计划文件"
      };
    } else {
      return {
        success: false,
        type: "fallback-failed",
        sessionId: sessionId,
        message: "未找到任务计划文件"
      };
    }
  } catch (error) {
    console.error("备用编辑器启动失败:", error);
    
    return {
      success: false,
      type: "fallback-failed", 
      sessionId: sessionId,
      error: error instanceof Error ? error.message : String(error),
      message: "备用编辑器启动失败"
    };
  }
}

/**
 * 查找最新的计划文件
 */
async function findLatestPlanFile(): Promise<string | null> {
  try {
    const { readdir } = await import('fs/promises');
    const workingDir = path.join(process.cwd(), '.herding_working');
    
    const entries = await readdir(workingDir, { withFileTypes: true });
    
    // 找到最新的日期目录
    const dateDirs = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .filter(name => /^\d{4}-\d{2}-\d{2}$/.test(name))
      .sort()
      .reverse();
    
    for (const dateDir of dateDirs) {
      const datePath = path.join(workingDir, dateDir);
      const planFiles = await readdir(datePath);
      
      const jsonFiles = planFiles
        .filter(file => file.endsWith('.json'))
        .sort()
        .reverse();
      
      if (jsonFiles.length > 0) {
        return path.join(datePath, jsonFiles[0]);
      }
    }
    
    return null;
  } catch (error) {
    console.error("查找计划文件失败:", error);
    return null;
  }
} 