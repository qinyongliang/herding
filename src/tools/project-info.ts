import { readdir, readFile, stat } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

interface ProjectInfoParams {
  rootPath: string;
}

/**
 * 获取项目信息，包括git用户名和当前时间
 */
export async function handleGetProjectInfo(params: ProjectInfoParams): Promise<any> {
  try {
    console.log(`📊 获取项目信息: ${params.rootPath}`);

    // 1. 获取git用户名
    const gitUsername = await getGitUsername();
    
    // 2. 获取当前时间
    const currentTime = await getCurrentTime();
    
    // 3. 分析项目结构
    const projectStructure = await analyzeProjectStructure(params.rootPath);
    
    // 4. 获取项目文件信息
    const projectFiles = await getProjectFiles(params.rootPath);
    
    return {
      content: [
        {
          type: "text",
          text: `📊 项目信息汇总

🏗️ **项目结构分析**
${projectStructure}

📂 **项目文件信息**
${projectFiles}

👤 **上下文信息 (Context Info)**
- Git用户: ${gitUsername}
- 当前时间: ${currentTime}
- 工作目录: ${params.rootPath}
- 分析完成时间: ${new Date().toLocaleString()}

📋 **使用说明**
此信息已获取完成，您可以使用其他工具来：
- 使用 plan 工具创建任务计划
- 使用 complete-task 工具执行任务
- 使用 update-project-info 工具更新项目信息`,
        },
      ],
      projectInfo: {
        rootPath: params.rootPath,
        gitUsername: gitUsername,
        currentTime: currentTime,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error("获取项目信息失败:", error);
    return {
      content: [
        {
          type: "text",
          text: `❌ 获取项目信息失败: ${
            error instanceof Error ? error.message : String(error)
          }

💡 可能的原因：
1. 项目路径不存在或不可访问
2. Git配置问题
3. 文件系统权限问题

🔧 请检查项目路径和权限设置。`,
        },
      ],
    };
  }
}

/**
 * 获取Git用户名
 */
async function getGitUsername(): Promise<string> {
  try {
    const { stdout } = await execAsync('git config user.name');
    return stdout.trim() || 'Unknown User';
  } catch (error) {
    console.warn("获取Git用户名失败:", error);
    return 'Unknown User';
  }
}

/**
 * 获取当前时间
 */
async function getCurrentTime(): Promise<string> {
  try {
    const { stdout } = await execAsync('date');
    return stdout.trim();
  } catch (error) {
    console.warn("获取系统时间失败:", error);
    return new Date().toLocaleString();
  }
}

/**
 * 分析项目结构
 */
async function analyzeProjectStructure(rootPath: string): Promise<string> {
  try {
    const entries = await readdir(rootPath, { withFileTypes: true });
    
    const directories = entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
    const files = entries.filter(entry => entry.isFile()).map(entry => entry.name);
    
    let structure = '';
    
    if (directories.length > 0) {
      structure += `📁 目录 (${directories.length}个):\n`;
      structure += directories.map(dir => `  - ${dir}`).join('\n');
      structure += '\n\n';
    }
    
    if (files.length > 0) {
      structure += `📄 文件 (${files.length}个):\n`;
      structure += files.slice(0, 10).map(file => `  - ${file}`).join('\n');
      if (files.length > 10) {
        structure += `\n  ... 以及其他 ${files.length - 10} 个文件`;
      }
    }
    
    return structure || '空目录';
  } catch (error) {
    console.error("分析项目结构失败:", error);
    return '无法访问项目结构';
  }
}

/**
 * 获取项目文件信息
 */
async function getProjectFiles(rootPath: string): Promise<string> {
  try {
    const importantFiles = [
      'package.json',
      'tsconfig.json', 
      'README.md',
      'index.ts',
      'src/index.ts',
      '.gitignore',
      'Cargo.toml',
      'pyproject.toml',
      'requirements.txt'
    ];
    
    const existingFiles: string[] = [];
    
    for (const file of importantFiles) {
      try {
        const filePath = path.join(rootPath, file);
        await stat(filePath);
        existingFiles.push(file);
      } catch {
        // 文件不存在，忽略
      }
    }
    
    if (existingFiles.length === 0) {
      return '未发现重要配置文件';
    }
    
    let fileInfo = `🔍 发现重要文件 (${existingFiles.length}个):\n`;
    fileInfo += existingFiles.map(file => `  ✅ ${file}`).join('\n');
    
    return fileInfo;
  } catch (error) {
    console.error("获取项目文件信息失败:", error);
    return '无法获取项目文件信息';
  }
} 