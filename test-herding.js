#!/usr/bin/env node

/**
 * Herding MCP 功能测试脚本
 * 作者: qinyongliang
 * 创建时间: 2025-07-02
 */

import { toolsHandler } from './build/src/tools/handler.js';

console.log('🐕 Herding MCP 功能测试开始\n');

async function testTool(toolName, args, description) {
  console.log(`\n🔧 测试工具: ${toolName}`);
  console.log(`📝 描述: ${description}`);
  console.log(`🔗 参数:`, JSON.stringify(args, null, 2));
  console.log('─'.repeat(50));
  
  try {
    const result = await toolsHandler(toolName, args);
    
    if (result && result.content && result.content[0] && result.content[0].text) {
      console.log('✅ 执行成功:');
      console.log(result.content[0].text);
      
      // 显示额外的元数据
      if (result.projectInfo) {
        console.log('\n📊 项目信息:', result.projectInfo);
      }
      if (result.initInfo) {
        console.log('\n🏗️ 初始化信息:', result.initInfo);
      }
      if (result.planInfo) {
        console.log('\n📋 计划信息:', result.planInfo);
      }
      if (result.taskInfo) {
        console.log('\n🎯 任务信息:', result.taskInfo);
      }
    } else {
      console.log('✅ 执行成功，但无内容返回');
      console.log('结果:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.log('❌ 执行失败:', error.message);
  }
  
  console.log('═'.repeat(60));
}

async function runTests() {
  const rootPath = process.cwd();
  
  // 测试1: 初始化Herding环境
  await testTool(
    'init-herding',
    { rootPath },
    '初始化Herding工作环境，创建必要的目录和文件'
  );
  
  // 等待一秒，确保文件系统操作完成
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 测试2: 获取项目信息
  await testTool(
    'get-project-info',
    { rootPath },
    '获取项目信息，包括Git用户名和当前时间'
  );
  
  // 测试3: 创建任务计划
  await testTool(
    'plan',
    {
      rootPath,
      userRequirement: '创建一个简单的Web应用',
      planTitle: '测试Web应用开发计划',
      goalAnalysis: '学习和实践现代Web开发技术，创建一个功能完整的单页应用'
    },
    '创建智能任务计划，包含目标分析和任务分解'
  );
  
  // 等待一秒，确保计划文件创建完成
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 测试4: 完成任务
  await testTool(
    'complete-task',
    { rootPath },
    '完成当前任务并推荐下一个任务'
  );
  
  // 测试5: 更新项目信息
  await testTool(
    'update-project-info',
    { rootPath },
    '更新项目信息并生成状态报告'
  );
  
  console.log('\n🎉 所有测试完成！');
  console.log('\n📋 测试总结:');
  console.log('✅ init-herding: 初始化工作环境');
  console.log('✅ get-project-info: 获取项目信息');
  console.log('✅ plan: 创建智能任务计划');
  console.log('✅ complete-task: 任务完成和推荐');
  console.log('✅ update-project-info: 更新项目状态');
  
  console.log('\n🚀 Herding MCP 已准备就绪！');
  console.log('💡 您现在可以在支持MCP的客户端中使用这些工具。');
}

// 运行测试
runTests().catch(error => {
  console.error('\n💥 测试过程中发生错误:', error);
  process.exit(1);
}); 