import { spawn } from "child_process";
import { promisify } from "util";
import path from "path";
import { writeFile, readFile, unlink } from "fs/promises";

interface UserAskParams {
  type: "confirm" | "input" | "select" | "info";
  title: string;
  message: string;
  options?: string[];
  defaultValue?: string;
  timeout?: number;
}

interface UserResponse {
  success: boolean;
  value?: string | boolean;
  cancelled?: boolean;
  timeout?: boolean;
}

/**
 * 使用桌面对话框与用户交互
 */
export async function handleUserAsk(params: UserAskParams): Promise<any> {
  try {
    console.log(`🔔 用户交互请求: ${params.type} - ${params.title}`);
    
    // 根据操作系统选择不同的实现方式
    const platform = process.platform;
    let response: UserResponse;

    if (platform === "win32") {
      response = await showWindowsDialog(params);
    } else if (platform === "darwin") {
      response = await showMacDialog(params);
    } else {
      response = await showLinuxDialog(params);
    }

    return formatResponse(params, response);
  } catch (error) {
    console.error("用户交互错误:", error);
    return {
      content: [
        {
          type: "text",
          text: `❌ 用户交互失败: ${error instanceof Error ? error.message : String(error)}
          
💡 提示: 请确保系统支持桌面对话框显示。`,
        },
      ],
    };
  }
}

/**
 * Windows平台对话框实现
 */
async function showWindowsDialog(params: UserAskParams): Promise<UserResponse> {
  // 使用PowerShell实现Windows对话框
  let psScript = "";
  
  switch (params.type) {
    case "confirm":
      psScript = `
        Add-Type -AssemblyName System.Windows.Forms
        $result = [System.Windows.Forms.MessageBox]::Show("${params.message}", "${params.title}", [System.Windows.Forms.MessageBoxButtons]::YesNo, [System.Windows.Forms.MessageBoxIcon]::Question)
        if ($result -eq "Yes") { "true" } else { "false" }
      `;
      break;
      
    case "input":
      psScript = `
        Add-Type -AssemblyName Microsoft.VisualBasic
        $result = [Microsoft.VisualBasic.Interaction]::InputBox("${params.message}", "${params.title}", "${params.defaultValue || ''}")
        $result
      `;
      break;
      
    case "select":
      if (!params.options?.length) {
        throw new Error("选择类型对话框需要提供选项");
      }
      const optionsText = params.options.map((opt, i) => `${i + 1}. ${opt}`).join("\\n");
      psScript = `
        Add-Type -AssemblyName Microsoft.VisualBasic
        $message = "${params.message}\\n\\n${optionsText}\\n\\n请输入选项编号:"
        $result = [Microsoft.VisualBasic.Interaction]::InputBox($message, "${params.title}", "1")
        $result
      `;
      break;
      
    case "info":
      psScript = `
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show("${params.message}", "${params.title}", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
        "ok"
      `;
      break;
  }

  return await executeScript("powershell", ["-Command", psScript], params);
}

/**
 * macOS平台对话框实现
 */
async function showMacDialog(params: UserAskParams): Promise<UserResponse> {
  let osascript = "";
  
  switch (params.type) {
    case "confirm":
      osascript = `display dialog "${params.message}" with title "${params.title}" buttons {"否", "是"} default button "是"`;
      break;
      
    case "input":
      osascript = `display dialog "${params.message}" with title "${params.title}" default answer "${params.defaultValue || ''}" buttons {"取消", "确定"} default button "确定"`;
      break;
      
    case "select":
      if (!params.options?.length) {
        throw new Error("选择类型对话框需要提供选项");
      }
      const optionsList = params.options.map(opt => `"${opt}"`).join(", ");
      osascript = `choose from list {${optionsList}} with title "${params.title}" with prompt "${params.message}"`;
      break;
      
    case "info":
      osascript = `display dialog "${params.message}" with title "${params.title}" buttons {"确定"} default button "确定"`;
      break;
  }

  return await executeScript("osascript", ["-e", osascript], params);
}

/**
 * Linux平台对话框实现
 */
async function showLinuxDialog(params: UserAskParams): Promise<UserResponse> {
  // 优先尝试zenity，然后是kdialog
  const hasZenity = await checkCommand("zenity");
  const hasKdialog = await checkCommand("kdialog");
  
  if (!hasZenity && !hasKdialog) {
    throw new Error("需要安装zenity或kdialog来显示对话框");
  }

  if (hasZenity) {
    return await showZenityDialog(params);
  } else {
    return await showKdialogDialog(params);
  }
}

/**
 * 使用Zenity显示对话框
 */
async function showZenityDialog(params: UserAskParams): Promise<UserResponse> {
  let args: string[] = [];
  
  switch (params.type) {
    case "confirm":
      args = ["--question", "--text", params.message, "--title", params.title];
      break;
      
    case "input":
      args = ["--entry", "--text", params.message, "--title", params.title];
      if (params.defaultValue) {
        args.push("--entry-text", params.defaultValue);
      }
      break;
      
    case "select":
      if (!params.options?.length) {
        throw new Error("选择类型对话框需要提供选项");
      }
      args = ["--list", "--text", params.message, "--title", params.title, "--column", "选项"];
      args.push(...params.options);
      break;
      
    case "info":
      args = ["--info", "--text", params.message, "--title", params.title];
      break;
  }

  return await executeScript("zenity", args, params);
}

/**
 * 使用KDialog显示对话框
 */
async function showKdialogDialog(params: UserAskParams): Promise<UserResponse> {
  let args: string[] = [];
  
  switch (params.type) {
    case "confirm":
      args = ["--yesno", params.message, "--title", params.title];
      break;
      
    case "input":
      args = ["--inputbox", params.message, params.defaultValue || "", "--title", params.title];
      break;
      
    case "select":
      if (!params.options?.length) {
        throw new Error("选择类型对话框需要提供选项");
      }
      args = ["--menu", params.message, "--title", params.title];
      params.options.forEach((opt, i) => {
        args.push(String(i + 1), opt);
      });
      break;
      
    case "info":
      args = ["--msgbox", params.message, "--title", params.title];
      break;
  }

  return await executeScript("kdialog", args, params);
}

/**
 * 执行系统命令
 */
async function executeScript(command: string, args: string[], params: UserAskParams): Promise<UserResponse> {
  return new Promise((resolve) => {
    const process = spawn(command, args, { 
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true 
    });
    
    let stdout = "";
    let stderr = "";
    
    process.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    // 设置超时
    let timeoutId: NodeJS.Timeout | undefined;
    if (params.timeout) {
      timeoutId = setTimeout(() => {
        process.kill();
        resolve({ success: false, timeout: true });
      }, params.timeout * 1000);
    }
    
    process.on('close', (code) => {
      if (timeoutId) clearTimeout(timeoutId);
      
      if (code === 0) {
        const result = parseDialogResult(params.type, stdout.trim());
        resolve({ success: true, value: result });
      } else {
        resolve({ success: false, cancelled: true });
      }
    });
    
    process.on('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId);
      console.error("对话框执行错误:", error);
      resolve({ success: false, cancelled: true });
    });
  });
}

/**
 * 解析对话框结果
 */
function parseDialogResult(type: string, result: string): string | boolean {
  switch (type) {
    case "confirm":
      return result === "true" || result.includes("是") || result.includes("Yes");
      
    case "input":
      return result;
      
    case "select":
      // 处理数字选择结果
      const num = parseInt(result);
      if (!isNaN(num)) {
        return result; // 返回选择的编号
      }
      return result; // 直接返回选择的文本
      
    case "info":
      return true;
      
    default:
      return result;
  }
}

/**
 * 检查命令是否存在
 */
async function checkCommand(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const process = spawn("which", [command], { stdio: 'ignore' });
    process.on('close', (code) => {
      resolve(code === 0);
    });
    process.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * 格式化响应结果
 */
function formatResponse(params: UserAskParams, response: UserResponse): any {
  if (!response.success) {
    if (response.timeout) {
      return {
        content: [
          {
            type: "text",
            text: `⏰ 用户交互超时 (${params.timeout}秒)
            
📝 问题: ${params.message}
❌ 结果: 超时未响应`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: `❌ 用户取消了操作
            
📝 问题: ${params.message}
❌ 结果: 用户取消`,
          },
        ],
      };
    }
  }

  // 成功响应
  let resultText = "";
  switch (params.type) {
    case "confirm":
      resultText = response.value ? "✅ 用户确认: 是" : "❌ 用户确认: 否";
      break;
      
    case "input":
      resultText = `📝 用户输入: "${response.value}"`;
      break;
      
    case "select":
      if (params.options) {
        const selectedIndex = parseInt(String(response.value)) - 1;
        const selectedOption = params.options[selectedIndex] || response.value;
        resultText = `🔘 用户选择: ${selectedOption}`;
      } else {
        resultText = `🔘 用户选择: ${response.value}`;
      }
      break;
      
    case "info":
      resultText = "✅ 信息已显示给用户";
      break;
  }

  return {
    content: [
      {
        type: "text",
        text: `💬 用户交互完成

📋 标题: ${params.title}
📝 问题: ${params.message}
${resultText}

💡 可以继续执行后续任务。`,
      },
    ],
    userResponse: {
      type: params.type,
      value: response.value,
      success: true
    }
  };
} 