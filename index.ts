#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { existsSync, promises as fs } from "fs";
import * as path from "path";
import { promisify } from "util";
import { z } from "zod";
import * as gitignoreParser from "gitignore-parser";

const execPromise = promisify(exec);

// 默认黑名单，当.gitignore不存在时使用
const folderBlackList = [
  "node_modules",
  ".herding_working",
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

const forceBlackList = [".git", ".herding_working", ".vscode", ".idea"];

const GET_PROJECT_TEMPLATE = `
This is the current project details, include project structure, dev attentions, and other important information:

{{S}}

Keep in mind:
1. after you finish modifying code to stisfy user requirements, you have to call 'update-project-info' which help you ensure the document remains up to date.
2. follow the response of 'update-project-info' to update .herding_working/*.md files.
`;

// 用于解析.gitignore文件的函数
async function parseGitignore(
  rootPath: string,
  targetPath: string
): Promise<boolean | null> {
  const gitignorePath = path.join(rootPath, ".gitignore");

  // 检查.gitignore文件是否存在
  if (!existsSync(gitignorePath)) {
    return null;
  }

  try {
    // 读取.gitignore文件内容
    const content = await fs.readFile(gitignorePath, "utf-8");
    // 使用gitignore-parser的compile方法解析.gitignore内容
    const gitignore = gitignoreParser.compile(content);

    // 使用denies方法检查路径是否被拒绝（被忽略）
    return gitignore.denies(targetPath);
  } catch (error) {
    console.error("Error parsing .gitignore:", error);
    return null;
  }
}

// Create server instance
const server = new Server({
  name: "herding-mcp-server",
  version: "1.0.9",
}, {
  capabilities: {
    tools: {},
  },
});

// Define our custom tools
const tools = [
  {
    name: "get-project-info",
    description: `Complete the project details and points to note.
its very important for LLM/Agent edit code. the more you konw, the more you can do.
its very useful for cursor or windsurf no martter in agent or edit mode.
**Highly recommended for use under all circumstances**.`,
    inputSchema: {
      type: "object",
      properties: {
        rootPath: {
          type: "string",
          description: `The root path of the project,
         C:/User/name/codeProject in windows
         /usr/name/codeProject/ in macos/linux`
        }
      },
      required: ["rootPath"]
    }
  },
  {
    name: "update-project-info",
    description: "when you have finished modifying code to stisfy user requirements, you have to update .herding_working/*.md files. This tool help you ensure the document remains up to date.",
    inputSchema: {
      type: "object",
      properties: {
        rootPath: {
          type: "string",
          description: `The root path of the project,
         "C:/User/name/codeProject" in windows
         "/usr/name/codeProject/" in macos/linux`
        }
      },
      required: ["rootPath"]
    }
  },
  {
    name: "init-herding",
    description: `Initialize .herding_working directory and files. which can help llm better understand your project.

  After init .herding_working directory and files, you should:
  1. every file in .herding_working directory is a markdown file, you can read them and update them.
  2. you have to follow the instructions in .herding_working/*.md files and update them.`,
    inputSchema: {
      type: "object",
      properties: {
        rootPath: {
          type: "string",
          description: `The root path of the project,
         "C:/User/name/codeProject" in windows
         "/usr/name/codeProject/" in macos/linux`
        }
      },
      required: ["rootPath"]
    }
  },
  {
    name: "plan",
    description: `Create a task plan by breaking down user requirements into specific, actionable tasks.
  
  This tool should be used whenever you receive user requirements to properly decompose them into manageable tasks. 
  Tasks will be stored in .herding_working/{date}/{time}.json for tracking and management.
  
  Each task should be:
  - Specific and actionable
  - Reasonably sized (not too big or too small)
  - Have clear completion criteria
  - Be ordered logically`,
    inputSchema: {
      type: "object",
      properties: {
        rootPath: {
          type: "string",
          description: `The root path of the project,
         "C:/User/name/codeProject" in windows
         "/usr/name/codeProject/" in macos/linux`
        },
        userRequirement: {
          type: "string",
          description: "The user requirement or request that needs to be decomposed into tasks"
        },
        planTitle: {
          type: "string",
          description: "A brief title for this plan (e.g., 'Add user authentication feature')"
        }
      },
      required: ["rootPath", "userRequirement", "planTitle"]
    }
  },
  {
    name: "complete-task",
    description: `Mark a task as completed and get the next task to work on.
  
  This tool will:
  1. Find and update the task completion status in the most recent task plan
  2. Return the next uncompleted task for you to work on
  3. If no specific task is provided, it will suggest the next logical task
  4. If all tasks are completed, it will trigger a code review process`,
    inputSchema: {
      type: "object",
      properties: {
        rootPath: {
          type: "string",
          description: `The root path of the project,
         "C:/User/name/codeProject" in windows
         "/usr/name/codeProject/" in macos/linux`
        },
        taskId: {
          type: "number",
          description: "The ID of the task to mark as completed. If not provided, will suggest the next task."
        },
        taskTitle: {
          type: "string",
          description: "The title of the task to mark as completed (used if taskId is not provided)"
        }
      },
      required: ["rootPath"]
    }
  }
];

// Set up tools/list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Set up tools/call handler  
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case "get-project-info":
      return await handleGetProjectInfo(args as { rootPath: string });
    
    case "update-project-info":
      return await handleUpdateProjectInfo(args as { rootPath: string });
    
    case "init-herding":
      return await handleInitHerding(args as { rootPath: string });
    
    case "plan":
      return await handlePlan(args as { rootPath: string; userRequirement: string; planTitle: string });
    
    case "complete-task":
      return await handleCompleteTask(args as { rootPath: string; taskId?: number; taskTitle?: string });
    
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Tool implementation functions
async function handleGetProjectInfo({ rootPath }: { rootPath: string }) {
  // 获取git用户名
  let gitUsername = "未知用户";
  try {
    const { stdout: gitUser } = await execPromise("git config user.name");
    gitUsername = gitUser.trim();
  } catch (error) {
    // 如果获取失败，保持默认值
  }

  // 获取当前时间
  let currentTime = "未知时间";
  try {
    const { stdout: timeStr } = await execPromise("date");
    currentTime = timeStr.trim();
  } catch (error) {
    currentTime = new Date().toLocaleString();
  }

  const content = await fs
    .readdir(path.join(rootPath, ".herding_working"))
    .then(async (files) => {
      const mdFiles = files.filter((f) => f.endsWith(".md"));
      const contents = await Promise.all(
        mdFiles.map(async (file) => {
          // ignore files start with "_", like _changelog.md
          if (file.startsWith("_")) {
            return "";
          }
          const content = await fs.readFile(
            path.join(rootPath, ".herding_working", file),
            "utf-8"
          );
          const name = path.basename(file, ".md");
          return `<${name}>\n\n${content}\n\n</${name}>\n`;
        })
      );
      
      // 添加git用户和当前时间信息
      const contextInfo = `<context_info>

Git用户: ${gitUsername}
当前时间: ${currentTime}

</context_info>

`;
      
      return GET_PROJECT_TEMPLATE.replace("{{S}}", contextInfo + contents.join("\n"));
    })
    .catch(() => "");
  return {
    content: [
      {
        type: "text",
        text: content,
      },
    ],
  };
}

async function handleUpdateProjectInfo({ rootPath }: { rootPath: string }) {
  return {
    content: [
      {
        type: "text",
        text: `[ATTENTION] Next step you must do: 
** Read files .herding_working/project.md and .herding_working/changelog.md and update them base on the changes you have just done.**
        `,
      },
    ],
  };
}

async function handleInitHerding({ rootPath }: { rootPath: string }) {
  try {
    await fs.mkdir(path.join(rootPath, ".herding_working"), { recursive: true });

    // 检查目标目录是否为空
    const files = await fs.readdir(path.join(rootPath, ".herding_working"));

    if (files.length === 0) {
      // 目录为空，执行 git clone
      const { stdout, stderr } = await execPromise(
        `git clone -b template https://github.com/qinyongliang/herding ${path.join(
          rootPath,
          ".herding_working"
        )}`
      );

      // remove .git folder
      await fs.rm(path.join(rootPath, ".herding_working", ".git"), {
        recursive: true,
      });
      const fileTree = await getFileTree(rootPath);

      // append filetree to .herding_working/project.md
      await fs.appendFile(
        path.join(rootPath, ".herding_working", "project.md"),
        `\n\`\`\`\n${fileTree}\n\`\`\`\n`
      );

      return {
        content: [
          {
            type: "text",
            text: `Successfully initialized .herding_working directory with template.\nOutput: ${stdout}\n${
              stderr ? `Error: ${stderr}` : ""
            }`,
          },
          {
            type: "text",
            text: `[Attention]\n
              Next step you should do:\n
              1. every file in .herding_working directory is a markdown file, you can read them and update them.
              2. you have to follow the instructions in .herding_working/*.md files and update them.
              3. before you finish edit .herding_working/*.md files, do not use update-project-info/get-project-info.
              4. after you finish edit .herding_working/*.md files, just stop.
              `,
          },
        ],
      };
    } else {
      // 目录不为空，提示用户
      return {
        content: [
          {
            type: "text",
            text: "The .herding_working directory already exists and is not empty. Please remove or empty it before initializing.",
          },
        ],
      };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Failed to initialize .herding_working directory: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
    };
  }
}

async function handlePlan({ rootPath, userRequirement, planTitle }: { rootPath: string; userRequirement: string; planTitle: string }) {
    try {
      // 获取当前日期和时间
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
      
      // 创建日期目录
      const datePath = path.join(rootPath, ".herding_working", dateStr);
      await fs.mkdir(datePath, { recursive: true });
      
      // 创建任务计划文件
      const planFile = path.join(datePath, `${timeStr}.json`);
      
      // 根据用户需求生成任务分解建议
      const taskPlan = {
        title: planTitle,
        userRequirement: userRequirement,
        createdAt: now.toISOString(),
        createdBy: "herding-mcp",
        status: "active",
        tasks: [
          {
            id: 1,
            title: "分析需求",
            description: "详细分析用户需求，确定实现方案",
            status: "pending",
            priority: "high",
            estimatedTime: "30分钟",
            dependencies: [],
            completed: false,
            completedAt: null
          },
          {
            id: 2,
            title: "设计实现方案",
            description: "基于需求分析，设计具体的实现方案",
            status: "pending",
            priority: "high",
            estimatedTime: "45分钟",
            dependencies: [1],
            completed: false,
            completedAt: null
          },
          {
            id: 3,
            title: "开始具体实现",
            description: "根据设计方案开始编码实现",
            status: "pending",
            priority: "medium",
            estimatedTime: "2小时",
            dependencies: [2],
            completed: false,
            completedAt: null
          },
          {
            id: 4,
            title: "测试验证",
            description: "测试实现的功能，确保符合需求",
            status: "pending",
            priority: "medium",
            estimatedTime: "30分钟",
            dependencies: [3],
            completed: false,
            completedAt: null
          },
          {
            id: 5,
            title: "文档更新",
            description: "更新相关文档，记录变更",
            status: "pending",
            priority: "low",
            estimatedTime: "15分钟",
            dependencies: [4],
            completed: false,
            completedAt: null
          }
        ]
      };
      
      // 保存任务计划
      await fs.writeFile(planFile, JSON.stringify(taskPlan, null, 2), 'utf-8');
      
      return {
        content: [
          {
            type: "text",
            text: `✅ 任务计划已创建成功！

📋 计划标题: ${planTitle}
📅 创建时间: ${now.toLocaleString()}
📂 文件位置: ${planFile}

🎯 用户需求: ${userRequirement}

📝 已生成 ${taskPlan.tasks.length} 个任务项:
${taskPlan.tasks.map(task => 
  `${task.id}. ${task.title} (${task.status}) - ${task.description}`
).join('\n')}

⚠️ 注意: 这是一个基础的任务分解模板，你应该根据具体需求调整任务内容。

🔄 下一步: 使用 complete-task 命令来逐步完成任务。`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
                      text: `❌ 创建任务计划失败: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
    };
  }
}

async function handleCompleteTask({ rootPath, taskId, taskTitle }: { rootPath: string; taskId?: number; taskTitle?: string }) {
    try {
      // 查找最新的任务计划文件
      const workingDir = path.join(rootPath, ".herding_working");
      const dates = await fs.readdir(workingDir, { withFileTypes: true });
      const dateDirs = dates
        .filter(dirent => dirent.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(dirent.name))
        .map(dirent => dirent.name)
        .sort()
        .reverse();
      
      if (dateDirs.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "❌ 没有找到任何任务计划。请先使用 plan 命令创建任务计划。",
            },
          ],
        };
      }
      
      // 查找最新日期目录中的任务文件
      let latestPlanFile = "";
      let taskPlan: any = null;
      
      for (const dateDir of dateDirs) {
        const datePath = path.join(workingDir, dateDir);
        const files = await fs.readdir(datePath);
        const jsonFiles = files
          .filter(file => file.endsWith('.json'))
          .sort()
          .reverse();
        
        if (jsonFiles.length > 0) {
          latestPlanFile = path.join(datePath, jsonFiles[0]);
          const content = await fs.readFile(latestPlanFile, 'utf-8');
          taskPlan = JSON.parse(content);
          break;
        }
      }
      
      if (!taskPlan) {
        return {
          content: [
            {
              type: "text",
              text: "❌ 没有找到任何有效的任务计划文件。",
            },
          ],
        };
      }
      
      // 如果没有提供任务ID，寻找下一个未完成的任务
      if (!taskId && !taskTitle) {
        const nextTask = taskPlan.tasks.find((task: any) => !task.completed);
        if (nextTask) {
          return {
            content: [
              {
                type: "text",
                text: `🎯 这是你需要完成的下一个任务：

📋 任务 #${nextTask.id}: ${nextTask.title}
📝 描述: ${nextTask.description}
⏱️ 预估时间: ${nextTask.estimatedTime}
🔥 优先级: ${nextTask.priority}

❓ 是否完成了这个任务？如果是，请调用: complete-task 并提供 taskId: ${nextTask.id}

📊 进度: ${taskPlan.tasks.filter((t: any) => t.completed).length}/${taskPlan.tasks.length} 任务已完成`,
              },
            ],
          };
        } else {
          // 所有任务都完成了
          taskPlan.status = "completed";
          taskPlan.completedAt = new Date().toISOString();
          await fs.writeFile(latestPlanFile, JSON.stringify(taskPlan, null, 2), 'utf-8');
          
          return {
            content: [
              {
                type: "text",
                text: `🎉 恭喜！所有任务都已完成！

📋 计划: ${taskPlan.title}
✅ 状态: 已完成
📅 完成时间: ${new Date().toLocaleString()}

🔍 接下来请进行代码审查流程：
1. 检查所有代码是否符合要求
2. 运行测试确保功能正常
3. 更新文档和注释
4. 提交变更

💡 建议使用 update-project-info 命令更新项目信息。`,
              },
            ],
          };
        }
      }
      
      // 根据ID或标题查找任务
      let targetTask = null;
      if (taskId) {
        targetTask = taskPlan.tasks.find((task: any) => task.id === taskId);
      } else if (taskTitle) {
        targetTask = taskPlan.tasks.find((task: any) => 
          task.title.toLowerCase().includes(taskTitle.toLowerCase())
        );
      }
      
      if (!targetTask) {
        // 如果找不到指定任务，返回最新未完成任务
        const nextTask = taskPlan.tasks.find((task: any) => !task.completed);
        if (nextTask) {
          return {
            content: [
              {
                type: "text",
                text: `❓ 未找到指定的任务。是否要完成这个任务？

📋 任务 #${nextTask.id}: ${nextTask.title}
📝 描述: ${nextTask.description}

如果确认完成，请重新调用 complete-task 并提供 taskId: ${nextTask.id}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: "❌ 未找到指定的任务，且所有任务都已完成。",
              },
            ],
          };
        }
      }
      
      // 标记任务为完成
      if (targetTask.completed) {
        return {
          content: [
            {
              type: "text",
              text: `ℹ️ 任务 #${targetTask.id}: ${targetTask.title} 已经完成了。`,
            },
          ],
        };
      }
      
      targetTask.completed = true;
      targetTask.completedAt = new Date().toISOString();
      
      // 保存更新后的任务计划
      await fs.writeFile(latestPlanFile, JSON.stringify(taskPlan, null, 2), 'utf-8');
      
      // 查找下一个任务
      const nextTask = taskPlan.tasks.find((task: any) => !task.completed);
      const completedCount = taskPlan.tasks.filter((t: any) => t.completed).length;
      
      if (nextTask) {
        return {
          content: [
            {
              type: "text",
              text: `✅ 任务已完成: ${targetTask.title}

🎯 这是你需要完成的下一个任务：

📋 任务 #${nextTask.id}: ${nextTask.title}
📝 描述: ${nextTask.description}
⏱️ 预估时间: ${nextTask.estimatedTime}
🔥 优先级: ${nextTask.priority}

📊 进度: ${completedCount}/${taskPlan.tasks.length} 任务已完成`,
            },
          ],
        };
      } else {
        // 所有任务都完成了
        taskPlan.status = "completed";
        taskPlan.completedAt = new Date().toISOString();
        await fs.writeFile(latestPlanFile, JSON.stringify(taskPlan, null, 2), 'utf-8');
        
        return {
          content: [
            {
              type: "text",
              text: `🎉 恭喜！所有任务都已完成！

📋 计划: ${taskPlan.title}
✅ 最后完成的任务: ${targetTask.title}
📅 完成时间: ${new Date().toLocaleString()}

🔍 接下来请进行代码审查流程：
1. 检查所有代码是否符合要求
2. 运行测试确保功能正常
3. 更新文档和注释
4. 提交变更

💡 建议使用 update-project-info 命令更新项目信息。`,
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ 处理任务时出错: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
      };
    }
  }

async function getFileTree(rootPath: string): Promise<string> {
  const indent = "    ";

  // 递归处理单个路径（目录或文件）
  const processEntry = async (entryPath: string, displayName: string, prefix: string, relativePath: string): Promise<string[]> => {
    const stat = await fs.stat(entryPath).catch(() => null);
    const lines: string[] = [];
    if (stat && stat.isDirectory()) {
      lines.push(`${prefix}- ${displayName}`);
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

  const buildTree = async (
    dir: string,
    prefix: string,
    relativePath: string = ""
  ): Promise<string[]> => {
    const herdingConfigPath = path.join(rootPath, ".herding_working.config");
    const result: string[] = [];
    const existsConfigFile = existsSync(herdingConfigPath) && !(await fs.stat(herdingConfigPath)).isDirectory();

    if (existsConfigFile && dir === rootPath) {
      // 读取 .herding_working.config 文件内容
      const content = await fs.readFile(herdingConfigPath, "utf-8");
      const lines = content
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"));
      if (lines.length) {
        for (const line of lines) {
          const entryPath = path.join(rootPath, line);
          result.push(...(await processEntry(entryPath, line, prefix, line.replace(/\\/g, "/"))));
        }
        return result;
      }
    }

    // 原有递归逻辑
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && forceBlackList.includes(entry.name)) {
        continue;
      }
      
      // 尝试解析.gitignore文件
      const entryRelativePath = path
        .join(relativePath, entry.name)
        .replace(/\\/g, "/");
      const isIgnore = await parseGitignore(rootPath, entryRelativePath);

      // 使用.gitignore规则或默认黑名单进行过滤
      const shouldIgnore =
        typeof isIgnore === "boolean"
          ? isIgnore
          : folderBlackList.includes(entry.name);
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
}); 