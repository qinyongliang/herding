import { handleGetProjectInfo } from "./project-info.js";
import { handleUpdateProjectInfo } from "./update-info.js";
import { handleInitHerding } from "./init-herding.js";
import { handleEnhancedPlan } from "../user-interaction/enhanced-plan.js";
import { handleCompleteTask } from "./complete-task.js";
import { handleUserAsk } from "../user-interaction/user-ask.js";

/**
 * 工具调用分发器
 */
export async function toolsHandler(name: string, args: any): Promise<any> {
  try {
    switch (name) {
      case "get-project-info":
        return await handleGetProjectInfo(args as { rootPath: string });

      case "update-project-info":
        return await handleUpdateProjectInfo(args as { rootPath: string });

      case "init-herding":
        return await handleInitHerding(args as { rootPath: string });

      case "plan":
        return await handleEnhancedPlan(args as { rootPath: string; userRequirement: string; planTitle: string; goalAnalysis: string });

      case "complete-task":
        return await handleCompleteTask(args as { rootPath: string; taskId?: number; taskTitle?: string });

      case "user-ask":
        return await handleUserAsk(args as { 
          type: "confirm" | "input" | "select" | "info";
          title: string;
          message: string;
          options?: string[];
          defaultValue?: string;
          timeout?: number;
        });

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `❌ Error executing tool '${name}': ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
    };
  }
} 