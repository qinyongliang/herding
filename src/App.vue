<script setup>
/**
 * @author qinyongliang
 * @date 2024-12-19
 * @description 文字输入界面
 */
import { ref, onMounted } from "vue";
import { invoke } from "@tauri-apps/api/core";

const inputText = ref("");
const notificationMessage = ref("");
const currentDirName = ref("");

// 获取当前目录名称和命令行参数
onMounted(async () => {
  try {
    // 通过Tauri API获取当前工作目录
    const currentDir = await invoke("get_current_dir");
    const segments = currentDir.split(/[/\\]/).filter(segment => segment);
    currentDirName.value = segments[segments.length - 1] || "herding";
    
    // 获取命令行参数中的描述信息
    const description = await invoke("get_description_from_args");
    notificationMessage.value = description;
  } catch (error) {
    console.error("获取信息失败:", error);
    currentDirName.value = "herding";
    notificationMessage.value = "RushAnswerNotifyService版本筛选功能单元测试已创建完成，包含10个测试场景，请审查并反馈。";
  }
});

function handleComplete() {
  console.log("完成输入:", inputText.value);
  console.log("当前目录名称:", currentDirName.value);
  console.log("内容已打印到控制台，程序退出");
  
  // 打印到控制台并退出
  invoke("print_and_exit", { content: inputText.value });
}

function handleCancel() {
  console.log("取消输入，直接退出");
  
  // 直接退出
  invoke("direct_exit");
}

function handleSelectAll() {
  if (inputText.value) {
    // 选择全部文本
    const textarea = document.querySelector('.input-textarea');
    if (textarea) {
      textarea.select();
    }
  }
}

// 处理快捷键
function handleKeydown(event) {
  if (event.ctrlKey && event.key === 'Enter') {
    handleComplete();
  } else if (event.key === 'Escape') {
    handleCancel();
  } else if (event.ctrlKey && event.key === 'a') {
    event.preventDefault();
    handleSelectAll();
  }
}
</script>

<template>
  <div class="app-container">
    <!-- 通知消息 -->
    <div class="notification-bar">
      <div class="notification-icon">📘</div>
      <div class="notification-text">{{ notificationMessage }}</div>
    </div>

    <!-- 主要输入区域 -->
    <div class="input-container">
      <textarea 
        v-model="inputText"
        class="input-textarea"
        placeholder="请输入内容..."
        @keydown="handleKeydown"
        autofocus
      ></textarea>
    </div>

    <!-- 底部操作栏 -->
    <div class="bottom-bar">
      <div class="shortcuts">
        <span class="shortcut-item">
          <span class="shortcut-key">Ctrl+Enter</span>
          <span class="shortcut-label">提交</span>
        </span>
        <span class="shortcut-separator">•</span>
        <span class="shortcut-item">
          <span class="shortcut-key">Esc</span>
          <span class="shortcut-label">取消</span>
        </span>
        <span class="shortcut-separator">•</span>
        <span class="shortcut-item">
          <span class="shortcut-key">Ctrl+A</span>
          <span class="shortcut-label">全选</span>
        </span>
      </div>
      <div class="action-buttons">
        <button class="btn btn-cancel" @click="handleCancel">取消</button>
        <button class="btn btn-complete" @click="handleComplete">完成</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #2d2d2d;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.notification-bar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: #1e1e1e;
  border-bottom: 1px solid #404040;
}

.notification-icon {
  font-size: 16px;
  margin-right: 8px;
}

.notification-text {
  font-size: 14px;
  color: #e0e0e0;
  line-height: 1.4;
}

.input-container {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.input-textarea {
  flex: 1;
  background-color: #1e1e1e;
  border: 1px solid #404040;
  border-radius: 4px;
  padding: 12px;
  font-size: 14px;
  color: #ffffff;
  font-family: inherit;
  resize: none;
  outline: none;
  line-height: 1.5;
}

.input-textarea:focus {
  border-color: #007acc;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
}

.input-textarea::placeholder {
  color: #888888;
}

.bottom-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #1e1e1e;
  border-top: 1px solid #404040;
}

.shortcuts {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #888888;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.shortcut-key {
  background-color: #404040;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
}

.shortcut-label {
  color: #cccccc;
}

.shortcut-separator {
  margin: 0 12px;
  color: #666666;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background-color: #404040;
  color: #ffffff;
}

.btn-cancel:hover {
  background-color: #505050;
}

.btn-complete {
  background-color: #007acc;
  color: #ffffff;
}

.btn-complete:hover {
  background-color: #0086e6;
}

.btn:active {
  transform: translateY(1px);
}
</style>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  overflow: hidden;
}

#app {
  height: 100vh;
}
</style>
