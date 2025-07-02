import { z } from "zod";

/**
 * Herding MCP 工具定义
 */
export const toolsDefinitions = [
  {
    name: "get-project-info",
    description: `Get project information and context, including git user and current time.
    
    This tool helps LLM understand the project structure, recent changes, and provides context like:
    - Git username (from git config user.name)  
    - Current timestamp (from date command)
    - Project structure and documentation
    - Recent changes and development history
    
    Use this tool to get comprehensive project context before starting any development work.`,
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

    This tool downloads template files from GitHub repository and sets up the initial project structure.
    It creates essential documentation files that help maintain project organization and tracking.
    `,
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
    description: `Create a task plan by analyzing user goals and breaking down requirements into specific, actionable tasks.
    
    🎯 IMPORTANT: You must analyze what the user wants to achieve (their ultimate goal) and use that goal to decompose tasks effectively.
    
    This tool should be used whenever you receive user requirements to properly decompose them into manageable tasks. 
    Tasks will be stored in .herding_working/{date}/{time}.json for tracking and management.
    
    After creating the plan, an interactive Tauri-based editing window will open for the user to:
    - Review and modify the generated tasks
    - Drag and drop to reorder tasks (with Ctrl+Z undo support)
    - Edit task content and descriptions  
    - Delete tasks (with Ctrl+Z undo support)
    - Request plan regeneration by providing additional text input
    
    Each task should be:
    - Specific and actionable
    - Reasonably sized (not too big or too small) 
    - Have clear completion criteria
    - Be ordered logically
    - Aligned with the identified goal`,
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
        },
        goalAnalysis: {
          type: "string",
          description: "Analysis of what the user ultimately wants to achieve - the core goal/objective behind their request"
        }
      },
      required: ["rootPath", "userRequirement", "planTitle", "goalAnalysis"]
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
  },
  {
    name: "user-ask",
    description: `Show an interactive dialog to ask user for input, confirmation, or selection.
    
    This tool creates a desktop popup window to interact with the user when:
    - Need user confirmation for important actions
    - Require user input for missing information
    - Present multiple options for user to choose from
    - Show progress updates or important notifications
    
    The dialog will block execution until user responds.`,
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["confirm", "input", "select", "info"],
          description: "Type of interaction: confirm (yes/no), input (text), select (options), info (notification)"
        },
        title: {
          type: "string",
          description: "Dialog window title"
        },
        message: {
          type: "string",
          description: "Main message or question to display"
        },
        options: {
          type: "array",
          items: { type: "string" },
          description: "Array of options for 'select' type"
        },
        defaultValue: {
          type: "string",
          description: "Default value for 'input' type"
        },
        timeout: {
          type: "number",
          description: "Auto-close timeout in seconds (optional)"
        }
      },
      required: ["type", "title", "message"]
    }
  }
]; 