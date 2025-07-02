import { writeFile, readFile, mkdir } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

interface UpdateInfoParams {
  rootPath: string;
}

/**
 * 更新项目信息并生成更新报告
 */
export async function handleUpdateProjectInfo(params: UpdateInfoParams): Promise<any> {
  try {
    console.log(`🔄 更新项目信息: ${params.rootPath}`);

    // 1. 确保.herding_working目录存在
    const workingDir = path.join(params.rootPath, '.herding_working');
    await mkdir(workingDir, { recursive: true });

    // 2. 获取更新信息
    const updateInfo = await generateUpdateInfo(params.rootPath);
    
    // 3. 保存更新日志
    const logFile = await saveUpdateLog(workingDir, updateInfo);
    
    // 4. 生成更新报告
    const report = generateUpdateReport(updateInfo, logFile);
    
    return {
      content: [
        {
          type: "text",
          text: report,
        },
      ],
      updateInfo: {
        timestamp: updateInfo.timestamp,
        logFile: logFile,
        changes: updateInfo.changes
      }
    };
  } catch (error) {
    console.error("更新项目信息失败:", error);
    return {
      content: [
        {
          type: "text",
          text: `❌ 更新项目信息失败: ${
            error instanceof Error ? error.message : String(error)
          }

💡 可能的原因：
1. 文件系统权限问题
2. .herding_working目录创建失败
3. Git操作失败

🔧 请检查项目权限和Git配置。`,
        },
      ],
    };
  }
}

/**
 * 生成更新信息
 */
async function generateUpdateInfo(rootPath: string): Promise<any> {
  const timestamp = new Date().toISOString();
  
  // 获取Git状态
  const gitStatus = await getGitStatus(rootPath);
  
  // 获取系统信息
  const systemInfo = await getSystemInfo();
  
  // 检查项目健康状况
  const healthCheck = await performHealthCheck(rootPath);
  
  return {
    timestamp,
    gitStatus,
    systemInfo,
    healthCheck,
    changes: [
      '✅ 项目信息已更新',
      '📊 Git状态已检查',
      '🖥️ 系统信息已获取',
      '🏥 项目健康检查已完成'
    ]
  };
}

/**
 * 获取Git状态
 */
async function getGitStatus(rootPath: string): Promise<any> {
  try {
    const { stdout: status } = await execAsync('git status --porcelain', { cwd: rootPath });
    const { stdout: branch } = await execAsync('git branch --show-current', { cwd: rootPath });
    const { stdout: lastCommit } = await execAsync('git log -1 --oneline', { cwd: rootPath });
    
    return {
      branch: branch.trim(),
      lastCommit: lastCommit.trim(),
      hasChanges: status.trim().length > 0,
      changes: status.trim().split('\n').filter(line => line.length > 0)
    };
  } catch (error) {
    console.warn("获取Git状态失败:", error);
    return {
      branch: 'unknown',
      lastCommit: 'unknown', 
      hasChanges: false,
      changes: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 获取系统信息
 */
async function getSystemInfo(): Promise<any> {
  try {
    const platform = process.platform;
    const nodeVersion = process.version;
    const { stdout: currentTime } = await execAsync('date');
    
    return {
      platform,
      nodeVersion,
      currentTime: currentTime.trim(),
      workingDirectory: process.cwd()
    };
  } catch (error) {
    console.warn("获取系统信息失败:", error);
    return {
      platform: process.platform,
      nodeVersion: process.version,
      currentTime: new Date().toISOString(),
      workingDirectory: process.cwd(),
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 执行项目健康检查
 */
async function performHealthCheck(rootPath: string): Promise<any> {
  const checks = [];
  
  try {
    // 检查package.json
    const packageJsonPath = path.join(rootPath, 'package.json');
    try {
      await readFile(packageJsonPath);
      checks.push('✅ package.json 存在');
    } catch {
      checks.push('⚠️ package.json 不存在');
    }
    
    // 检查.herding_working目录
    const workingDirPath = path.join(rootPath, '.herding_working');
    try {
      await readFile(workingDirPath);
      checks.push('✅ .herding_working 目录存在');
    } catch {
      checks.push('📁 .herding_working 目录已创建');
    }
    
    // 检查TypeScript配置
    const tsconfigPath = path.join(rootPath, 'tsconfig.json');
    try {
      await readFile(tsconfigPath);
      checks.push('✅ tsconfig.json 存在');
    } catch {
      checks.push('ℹ️ tsconfig.json 不存在（可选）');
    }
    
    return {
      status: 'healthy',
      checks,
      score: checks.filter(check => check.startsWith('✅')).length / checks.length
    };
  } catch (error) {
    return {
      status: 'error',
      checks: ['❌ 健康检查失败'],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 保存更新日志
 */
async function saveUpdateLog(workingDir: string, updateInfo: any): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(workingDir, `update-${timestamp}.json`);
  
  await writeFile(logFile, JSON.stringify(updateInfo, null, 2), 'utf-8');
  
  return logFile;
}

/**
 * 生成更新报告
 */
function generateUpdateReport(updateInfo: any, logFile: string): string {
  return `🔄 项目信息更新完成

📅 **更新时间**: ${new Date(updateInfo.timestamp).toLocaleString()}
📂 **日志文件**: ${logFile}

🔧 **Git状态**:
- 当前分支: ${updateInfo.gitStatus.branch}
- 最新提交: ${updateInfo.gitStatus.lastCommit}
- 待提交变更: ${updateInfo.gitStatus.hasChanges ? '有' : '无'}
${updateInfo.gitStatus.changes.length > 0 ? '\n变更文件:\n' + updateInfo.gitStatus.changes.map((c: string) => `  ${c}`).join('\n') : ''}

🖥️ **系统信息**:
- 平台: ${updateInfo.systemInfo.platform}
- Node.js版本: ${updateInfo.systemInfo.nodeVersion}
- 当前时间: ${updateInfo.systemInfo.currentTime}
- 工作目录: ${updateInfo.systemInfo.workingDirectory}

🏥 **健康检查** (得分: ${Math.round(updateInfo.healthCheck.score * 100)}%):
${updateInfo.healthCheck.checks.map((check: string) => `  ${check}`).join('\n')}

📋 **执行的变更**:
${updateInfo.changes.map((change: string) => `  ${change}`).join('\n')}

✅ 项目信息更新完成！下一步您可以使用其他工具继续操作。`;
} 