import { handleUserAsk } from "./user-ask.js";

/**
 * 用户交互功能演示和集成示例
 */

/**
 * 示例1: 确认重要操作
 */
export async function confirmImportantAction(actionName: string): Promise<boolean> {
  const result = await handleUserAsk({
    type: "confirm",
    title: "🔔 重要操作确认",
    message: `即将执行: ${actionName}\n\n这个操作可能会影响项目文件。\n是否继续？`,
    timeout: 30 // 30秒超时
  });

  return result.userResponse?.value === true;
}

/**
 * 示例2: 获取用户输入
 */
export async function getUserInput(prompt: string, defaultValue?: string): Promise<string | null> {
  const result = await handleUserAsk({
    type: "input", 
    title: "📝 需要您的输入",
    message: prompt,
    defaultValue: defaultValue,
    timeout: 60 // 60秒超时
  });

  if (result.userResponse?.success) {
    return result.userResponse.value as string;
  }
  return null;
}

/**
 * 示例3: 多选项选择
 */
export async function getUserChoice(question: string, options: string[]): Promise<string | null> {
  const result = await handleUserAsk({
    type: "select",
    title: "🔘 请选择",
    message: question,
    options: options,
    timeout: 45 // 45秒超时
  });

  if (result.userResponse?.success) {
    const selectedIndex = parseInt(result.userResponse.value as string) - 1;
    return options[selectedIndex] || result.userResponse.value as string;
  }
  return null;
}

/**
 * 示例4: 显示重要信息
 */
export async function showInfo(title: string, message: string): Promise<void> {
  await handleUserAsk({
    type: "info",
    title: title,
    message: message,
    timeout: 10 // 10秒后自动关闭
  });
}

/**
 * 集成示例: 在任务执行过程中的用户交互流程
 */
export async function interactiveTaskExecution(): Promise<void> {
  console.log("🚀 开始交互式任务执行演示...");

  // 1. 确认开始任务
  const startConfirmed = await confirmImportantAction("开始执行复杂的代码重构任务");
  if (!startConfirmed) {
    await showInfo("ℹ️ 任务取消", "用户取消了任务执行。");
    return;
  }

  // 2. 获取用户偏好
  const strategy = await getUserChoice(
    "请选择重构策略:",
    ["保守重构 - 最小化更改", "激进重构 - 全面优化", "平衡重构 - 适度改进"]
  );

  if (!strategy) {
    await showInfo("❌ 任务终止", "未选择重构策略，任务终止。");
    return;
  }

  // 3. 获取额外配置
  const customConfig = await getUserInput(
    "是否有特殊配置要求？\n(留空使用默认配置)",
    "使用默认配置"
  );

  // 4. 确认执行计划
  const planConfirmed = await confirmImportantAction(
    `执行${strategy}，配置: ${customConfig}`
  );

  if (!planConfirmed) {
    await showInfo("❌ 任务取消", "用户不同意执行计划。");
    return;
  }

  // 5. 显示开始执行信息
  await showInfo(
    "✅ 任务开始", 
    `正在执行${strategy}\n配置: ${customConfig}\n\n请等待任务完成...`
  );

  console.log("✅ 交互式任务执行演示完成");
}

/**
 * 错误处理示例
 */
export async function handleErrorWithUserInput(error: Error): Promise<"retry" | "skip" | "abort"> {
  const choice = await getUserChoice(
    `执行过程中发生错误:\n${error.message}\n\n请选择如何处理:`,
    ["重试", "跳过此步骤", "终止任务"]
  );

  switch (choice) {
    case "重试": return "retry";
    case "跳过此步骤": return "skip";
    case "终止任务": return "abort";
    default: return "abort";
  }
}

/**
 * 进度更新示例
 */
export async function showProgress(current: number, total: number, taskName: string): Promise<void> {
  const percentage = Math.round((current / total) * 100);
  await showInfo(
    `📊 任务进度 ${percentage}%`,
    `${taskName}\n\n进度: ${current}/${total} (${percentage}%)\n\n${percentage < 100 ? '请稍等...' : '✅ 完成！'}`
  );
} 