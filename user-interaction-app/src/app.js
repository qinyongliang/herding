// Tauri API 引用
const { invoke } = window.__TAURI__.tauri;

// 全局状态
let currentPlan = null;
let isDragging = false;
let draggedElement = null;

// 应用初始化
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Herding MCP UI 启动中...');
    
    // 键盘快捷键绑定
    document.addEventListener('keydown', handleKeyboard);
    
    // 获取URL参数中的session_id
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id') || 'default';
    
    console.log('Session ID:', sessionId);
    
    // 加载任务计划
    await loadPlan(sessionId);
});

// 键盘事件处理
function handleKeyboard(event) {
    // Ctrl+Z 撤销
    if (event.ctrlKey && event.key === 'z') {
        event.preventDefault();
        undoOperation();
    }
    
    // Ctrl+S 保存
    if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        savePlan();
    }
    
    // ESC 取消拖拽
    if (event.key === 'Escape' && isDragging) {
        cancelDrag();
    }
}

// 加载任务计划
async function loadPlan(sessionId) {
    try {
        const plan = await invoke('load_plan', { sessionId });
        console.log('加载的计划:', plan);
        
        if (plan) {
            currentPlan = plan;
            renderPlan(plan);
        } else {
            showEmptyState();
        }
    } catch (error) {
        console.error('加载计划失败:', error);
        showError('加载计划失败: ' + error);
    }
}

// 渲染任务计划
function renderPlan(plan) {
    // 更新头部信息
    document.getElementById('planTitle').textContent = `📋 ${plan.title}`;
    document.getElementById('planGoal').textContent = `🎯 ${plan.goal}`;
    
    // 渲染任务列表
    const taskList = document.getElementById('taskList');
    
    if (plan.tasks.length === 0) {
        showEmptyState();
        return;
    }
    
    taskList.innerHTML = '';
    
    plan.tasks.forEach((task, index) => {
        const taskElement = createTaskElement(task, index);
        taskList.appendChild(taskElement);
    });
}

// 创建任务元素
function createTaskElement(task, index) {
    const taskDiv = document.createElement('div');
    taskDiv.className = 'task-item';
    taskDiv.draggable = true;
    taskDiv.dataset.taskId = task.id;
    taskDiv.dataset.index = index;
    
    // 根据优先级设置边框颜色
    const priorityColors = {
        'high': '#e53e3e',
        'medium': '#d69e2e', 
        'low': '#38a169'
    };
    taskDiv.style.borderLeftColor = priorityColors[task.priority] || '#4299e1';
    
    taskDiv.innerHTML = `
        <div class="task-header">
            <span class="task-id">#${task.id}</span>
            <div class="task-title" contenteditable="true" onblur="updateTaskTitle(${task.id}, this.textContent)">${task.title}</div>
            <span class="task-priority priority-${task.priority}">${getPriorityText(task.priority)}</span>
            <div class="task-actions">
                <button class="action-btn edit-btn" onclick="editTask(${task.id})">✏️</button>
                <button class="action-btn delete-btn" onclick="deleteTask(${task.id})">🗑️</button>
            </div>
        </div>
        <div class="task-description" contenteditable="true" onblur="updateTaskDescription(${task.id}, this.textContent)">${task.description}</div>
        <div class="task-meta">
            <span>⏱️ ${task.estimated_time}</span>
            <span>📊 ${getStatusText(task.status)}</span>
            <span>✅ ${task.completed ? '已完成' : '待完成'}</span>
        </div>
    `;
    
    // 拖拽事件
    taskDiv.addEventListener('dragstart', handleDragStart);
    taskDiv.addEventListener('dragend', handleDragEnd);
    taskDiv.addEventListener('dragover', handleDragOver);
    taskDiv.addEventListener('drop', handleDrop);
    
    return taskDiv;
}

// 获取优先级文本
function getPriorityText(priority) {
    const texts = {
        'high': '高优先级',
        'medium': '中优先级',
        'low': '低优先级'
    };
    return texts[priority] || priority;
}

// 获取状态文本
function getStatusText(status) {
    const texts = {
        'pending': '待开始',
        'in_progress': '进行中',
        'completed': '已完成',
        'blocked': '被阻塞'
    };
    return texts[status] || status;
}

// 拖拽开始
function handleDragStart(event) {
    isDragging = true;
    draggedElement = event.target;
    event.target.classList.add('dragging');
    
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', event.target.outerHTML);
    event.dataTransfer.setData('text/plain', event.target.dataset.index);
}

// 拖拽结束
function handleDragEnd(event) {
    isDragging = false;
    event.target.classList.remove('dragging');
    draggedElement = null;
}

// 拖拽经过
function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
}

// 放置处理
function handleDrop(event) {
    event.preventDefault();
    
    if (draggedElement && event.target.classList.contains('task-item')) {
        const fromIndex = parseInt(draggedElement.dataset.index);
        const toIndex = parseInt(event.target.dataset.index);
        
        if (fromIndex !== toIndex) {
            reorderTasks(fromIndex, toIndex);
        }
    }
}

// 重新排序任务
function reorderTasks(fromIndex, toIndex) {
    if (!currentPlan) return;
    
    console.log(`移动任务从 ${fromIndex} 到 ${toIndex}`);
    
    // 保存操作到历史记录
    saveToHistory();
    
    // 移动任务
    const tasks = currentPlan.tasks;
    const movedTask = tasks.splice(fromIndex, 1)[0];
    tasks.splice(toIndex, 0, movedTask);
    
    // 重新渲染
    renderPlan(currentPlan);
}

// 更新任务标题
function updateTaskTitle(taskId, newTitle) {
    if (!currentPlan) return;
    
    const task = currentPlan.tasks.find(t => t.id === taskId);
    if (task && task.title !== newTitle.trim()) {
        saveToHistory();
        task.title = newTitle.trim();
        console.log(`更新任务 ${taskId} 标题: ${newTitle}`);
    }
}

// 更新任务描述
function updateTaskDescription(taskId, newDescription) {
    if (!currentPlan) return;
    
    const task = currentPlan.tasks.find(t => t.id === taskId);
    if (task && task.description !== newDescription.trim()) {
        saveToHistory();
        task.description = newDescription.trim();
        console.log(`更新任务 ${taskId} 描述: ${newDescription}`);
    }
}

// 删除任务
function deleteTask(taskId) {
    if (!currentPlan) return;
    
    if (confirm('确定要删除这个任务吗？此操作可以通过Ctrl+Z撤销。')) {
        saveToHistory();
        
        currentPlan.tasks = currentPlan.tasks.filter(t => t.id !== taskId);
        renderPlan(currentPlan);
        
        console.log(`删除任务 ${taskId}`);
    }
}

// 编辑任务（预留接口）
function editTask(taskId) {
    console.log(`编辑任务 ${taskId}`);
    // TODO: 打开任务编辑对话框
}

// 添加新任务
function addNewTask() {
    if (!currentPlan) return;
    
    saveToHistory();
    
    const newId = Math.max(...currentPlan.tasks.map(t => t.id), 0) + 1;
    const newTask = {
        id: newId,
        title: '新任务',
        description: '请编辑任务描述',
        status: 'pending',
        priority: 'medium',
        estimated_time: '30分钟',
        dependencies: [],
        completed: false,
        completed_at: null
    };
    
    currentPlan.tasks.push(newTask);
    renderPlan(currentPlan);
    
    console.log('添加新任务:', newTask);
}

// 保存到历史记录
function saveToHistory() {
    // 由后端Tauri处理历史记录
}

// 保存计划
async function savePlan() {
    if (!currentPlan) return;
    
    try {
        const result = await invoke('save_plan', { plan: currentPlan });
        console.log('保存结果:', result);
        
        // 显示保存成功提示
        showNotification('✅ 计划保存成功', 'success');
    } catch (error) {
        console.error('保存失败:', error);
        showNotification('❌ 保存失败: ' + error, 'error');
    }
}

// 撤销操作
async function undoOperation() {
    try {
        const previousPlan = await invoke('undo_operation');
        
        if (previousPlan) {
            currentPlan = previousPlan;
            renderPlan(currentPlan);
            showNotification('↶ 已撤销上一步操作', 'info');
        } else {
            showNotification('没有可撤销的操作', 'warning');
        }
    } catch (error) {
        console.error('撤销失败:', error);
        showNotification('❌ 撤销失败: ' + error, 'error');
    }
}

// 完成编辑
async function finishEditing() {
    if (confirm('确定完成编辑吗？编辑完成后将关闭窗口并返回结果给Cursor。')) {
        try {
            // 首先保存当前计划
            await savePlan();
            
            // 调用后端获取最终结果
            const result = await invoke('finish_editing');
            console.log('编辑完成，最终计划:', result);
            
            // 显示成功消息
            showNotification('✅ 编辑完成，结果已返回给Cursor', 'success');
            
            // 延迟关闭窗口，让用户看到成功消息
            setTimeout(() => {
                window.close();
            }, 1500);
            
        } catch (error) {
            console.error('完成编辑失败:', error);
            showNotification('❌ 完成编辑失败: ' + error, 'error');
        }
    }
}

// 显示空状态
function showEmptyState() {
    const taskList = document.getElementById('taskList');
    taskList.innerHTML = `
        <div class="empty-state">
            <h3>📝 暂无任务</h3>
            <p>点击"添加任务"按钮开始创建您的任务计划</p>
        </div>
    `;
}

// 显示错误
function showError(message) {
    const taskList = document.getElementById('taskList');
    taskList.innerHTML = `
        <div class="empty-state">
            <h3>❌ 出现错误</h3>
            <p>${message}</p>
        </div>
    `;
}

// 显示通知
function showNotification(message, type = 'info') {
    // 简单的通知实现
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // TODO: 实现更好的通知UI
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#e53e3e' : '#4299e1'};
        color: white;
        padding: 10px 20px;
        border-radius: 6px;
        z-index: 1000;
        transition: all 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// 取消拖拽
function cancelDrag() {
    if (isDragging && draggedElement) {
        draggedElement.classList.remove('dragging');
        isDragging = false;
        draggedElement = null;
    }
} 