// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::State;
use tokio::sync::Mutex;

// 任务项数据结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskItem {
    pub id: u32,
    pub title: String,
    pub description: String,
    pub status: String,
    pub priority: String,
    pub estimated_time: String,
    pub dependencies: Vec<u32>,
    pub completed: bool,
    pub completed_at: Option<String>,
}

// 任务计划数据结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskPlan {
    pub title: String,
    pub user_requirement: String,
    pub goal: String, // 新增：计划目标
    pub created_at: String,
    pub created_by: String,
    pub status: String,
    pub completed_at: Option<String>,
    pub tasks: Vec<TaskItem>,
    pub session_id: String,
}

// 应用状态
#[derive(Default)]
pub struct AppState {
    pub current_plan: Mutex<Option<TaskPlan>>,
    pub history: Mutex<Vec<TaskPlan>>, // 撤销历史
}

// Tauri命令：加载任务计划
#[tauri::command]
async fn load_plan(session_id: String, state: State<'_, AppState>) -> Result<Option<TaskPlan>, String> {
    println!("Loading plan with session_id: {}", session_id);
    
    // TODO: 从文件系统加载计划
    // 这里暂时返回一个示例计划
    let example_plan = TaskPlan {
        title: "示例计划".to_string(),
        user_requirement: "用户需求示例".to_string(),
        goal: "实现项目目标".to_string(),
        created_at: "2025-07-02T23:30:00Z".to_string(),
        created_by: "herding-mcp".to_string(),
        status: "active".to_string(),
        completed_at: None,
        tasks: vec![
            TaskItem {
                id: 1,
                title: "分析需求".to_string(),
                description: "详细分析用户需求，确定实现方案".to_string(),
                status: "pending".to_string(),
                priority: "high".to_string(),
                estimated_time: "30分钟".to_string(),
                dependencies: vec![],
                completed: false,
                completed_at: None,
            }
        ],
        session_id: session_id.clone(),
    };
    
    let mut current_plan = state.current_plan.lock().await;
    *current_plan = Some(example_plan.clone());
    
    Ok(Some(example_plan))
}

// Tauri命令：保存任务计划
#[tauri::command]
async fn save_plan(plan: TaskPlan, state: State<'_, AppState>) -> Result<String, String> {
    println!("Saving plan: {}", plan.title);
    
    // 保存到历史记录
    let mut history = state.history.lock().await;
    if let Some(current) = state.current_plan.lock().await.as_ref() {
        history.push(current.clone());
    }
    
    // 更新当前计划
    let mut current_plan = state.current_plan.lock().await;
    *current_plan = Some(plan.clone());
    
    // TODO: 保存到文件系统
    
    Ok("Plan saved successfully".to_string())
}

// Tauri命令：撤销操作
#[tauri::command]
async fn undo_operation(state: State<'_, AppState>) -> Result<Option<TaskPlan>, String> {
    let mut history = state.history.lock().await;
    
    if let Some(previous_plan) = history.pop() {
        let mut current_plan = state.current_plan.lock().await;
        *current_plan = Some(previous_plan.clone());
        Ok(Some(previous_plan))
    } else {
        Ok(None)
    }
}

// Tauri命令：获取当前计划
#[tauri::command]
async fn get_current_plan(state: State<'_, AppState>) -> Result<Option<TaskPlan>, String> {
    let current_plan = state.current_plan.lock().await;
    Ok(current_plan.clone())
}

fn main() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            load_plan,
            save_plan,
            undo_operation,
            get_current_plan
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
} 