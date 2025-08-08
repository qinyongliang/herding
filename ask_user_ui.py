#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
import argparse
import tkinter as tk
from tkinter import messagebox
import threading
import select
import time
sys.stdout.reconfigure(encoding='utf-8')

class ModernPromptInputWindow:
    def __init__(self, prompt_text, stdin_content=None, countdown_seconds=60):
        self.result = None
        self.root = tk.Tk()
        self.stdin_content = stdin_content  # 存储从stdin读取的内容
        
        # 倒计时设置
        self.countdown_total_seconds = max(0, int(countdown_seconds or 0))
        self.countdown_remaining_seconds = self.countdown_total_seconds
        self.countdown_active = False
        self.countdown_after_id = None
        # 程序化内容更新标记，避免误触发倒计时终止
        self.is_programmatic_update = False
        
        # 获取当前目录名称作为标题
        current_dir = os.path.basename(os.getcwd())
        self.root.title(f"💻 {current_dir} ")

        
        self.root.geometry("600x450")  # 增加高度以适应自定义标题栏
        
        # 全局置顶
        self.root.attributes("-topmost", True)
        
        # 隐藏系统标题栏但保持任务栏图标（Windows特定）
        try:
            # 在Windows上隐藏标题栏但保持任务栏图标
            self.root.attributes('-toolwindow', False)
            self.root.overrideredirect(True)
        except:
            # 如果上面的方法不工作，则尝试其他方法
            self.root.overrideredirect(True)
        
        # 使用现代编程工具的深色主题
        self.root.configure(bg='#2d2d30')
        
        # 设置窗口图标（可选，如果有图标文件的话）
        try:
            # 这里可以设置窗口图标，如果有图标文件的话
            # self.root.iconbitmap("icon.ico")
            pass
        except:
            pass
        
        # 用于拖拽窗口
        self.drag_data = {"x": 0, "y": 0}
        
        # 获取当前目录名称用于界面显示
        self.current_dir_name = current_dir
        
        # 创建现代化界面
        self.create_widgets(prompt_text)
        self.setup_bindings()
        
        # 在界面创建完成后居中显示
        self.center_window()
        
        # 如果有stdin内容，设置到文本框中
        if self.stdin_content:
            self.root.after(100, self.set_stdin_content)
        
        # 启动倒计时（如果需要）
        if self.countdown_total_seconds > 0:
            self.start_countdown()
    
    def set_stdin_content(self):
        """将stdin内容设置到文本框中并全选"""
        if self.stdin_content:
            # 先设置为非占位符状态，防止focus事件干扰
            self.is_placeholder = False
            
            # 直接清除所有内容并设置正常文字颜色
            self.text_area.delete('1.0', 'end')
            self.text_area.config(fg='#d4d4d4')  # 恢复正常文字颜色
            
            # 插入stdin内容
            self.text_area.insert('1.0', self.stdin_content)
            # 插入为程序化更新，重置modified状态
            try:
                self.text_area.edit_modified(False)
            except Exception:
                pass
            
            # 全选内容
            self.text_area.tag_remove('sel', '1.0', 'end')
            lines = self.stdin_content.split('\n')
            last_line = len(lines)
            last_char = len(lines[-1])
            end_pos = f"{last_line}.{last_char}"
            self.text_area.tag_add('sel', '1.0', end_pos)
            self.text_area.mark_set('insert', end_pos)
            
            # 设置焦点到文本框
            self.text_area.focus_set()
    
    def center_window(self):
        self.root.update_idletasks()
        width, height = 600, 450
        x = (self.root.winfo_screenwidth() // 2) - (width // 2)
        y = (self.root.winfo_screenheight() // 2) - (height // 2)
        self.root.geometry(f"{width}x{height}+{x}+{y}")
    
    def create_custom_titlebar(self, parent):
        """创建自定义标题栏"""
        titlebar_frame = tk.Frame(parent, bg='#2d2d30', height=30)
        titlebar_frame.pack(fill='x', pady=0)
        titlebar_frame.pack_propagate(False)
        
        # 标题文字 - 显示当前目录名称
        title_label = tk.Label(titlebar_frame, text=f"💻 {self.current_dir_name} - 文字输入", 
                              font=('Consolas', 10, 'bold'), 
                              bg='#2d2d30', fg='#569cd6',
                              anchor='w')
        title_label.pack(side='left', padx=10, pady=5)
        
        # 关闭按钮
        close_btn = tk.Button(titlebar_frame, text="✕", 
                             font=('Consolas', 12, 'bold'),
                             bg='#2d2d30', fg='#cccccc',
                             relief='flat', bd=0, width=3,
                             activebackground='#e74c3c',
                             activeforeground='#ffffff',
                             command=self.on_cancel,
                             cursor='hand2')
        close_btn.pack(side='right', padx=(0, 5), pady=2)
        
        # 最小化按钮
        minimize_btn = tk.Button(titlebar_frame, text="─", 
                                font=('Consolas', 12, 'bold'),
                                bg='#2d2d30', fg='#cccccc',
                                relief='flat', bd=0, width=3,
                                activebackground='#3e3e42',
                                activeforeground='#ffffff',
                                command=self.minimize_window,
                                cursor='hand2')
        minimize_btn.pack(side='right', padx=2, pady=2)
        
        # 置顶切换按钮
        self.topmost_btn = tk.Button(titlebar_frame, text="📌", 
                                    font=('Consolas', 10, 'bold'),
                                    bg='#2d2d30', fg='#569cd6',
                                    relief='flat', bd=0, width=3,
                                    activebackground='#3e3e42',
                                    activeforeground='#ffffff',
                                    command=self.toggle_topmost,
                                    cursor='hand2')
        self.topmost_btn.pack(side='right', padx=2, pady=2)
        
        # 绑定拖拽事件到标题栏
        titlebar_frame.bind("<Button-1>", self.start_drag)
        titlebar_frame.bind("<B1-Motion>", self.do_drag)
        title_label.bind("<Button-1>", self.start_drag)
        title_label.bind("<B1-Motion>", self.do_drag)
        
        return titlebar_frame
    
    def toggle_topmost(self):
        """切换置顶状态"""
        current_topmost = self.root.attributes("-topmost")
        new_topmost = not current_topmost
        self.root.attributes("-topmost", new_topmost)
        
        # 更新按钮颜色
        if new_topmost:
            self.topmost_btn.configure(fg='#569cd6')  # 蓝色表示已置顶
        else:
            self.topmost_btn.configure(fg='#cccccc')  # 灰色表示未置顶
    
    def start_drag(self, event):
        """开始拖拽"""
        self.drag_data["x"] = event.x
        self.drag_data["y"] = event.y
    
    def do_drag(self, event):
        """执行拖拽"""
        x = self.root.winfo_x() + event.x - self.drag_data["x"]
        y = self.root.winfo_y() + event.y - self.drag_data["y"]
        self.root.geometry(f"+{x}+{y}")
    
    def minimize_window(self):
        """最小化窗口"""
        self.root.iconify()
    
    def create_widgets(self, prompt_text):
        # 创建主容器
        main_container = tk.Frame(self.root, bg='#2d2d30')
        main_container.pack(fill='both', expand=True)
        
        # 创建自定义标题栏
        self.create_custom_titlebar(main_container)
        
        # 分隔线
        separator = tk.Frame(main_container, bg='#3e3e42', height=1)
        separator.pack(fill='x')
        
        # 创建内容区域
        content_frame = tk.Frame(main_container, bg='#2d2d30', padx=20, pady=20)
        content_frame.pack(fill='both', expand=True)
        
        # 提示标签 - 使用编程工具常见的蓝色，支持自动换行
        prompt_label = tk.Label(content_frame, text=f"💻 {prompt_text}", 
                               font=('Consolas', 13, 'normal'), 
                               bg='#2d2d30', fg='#569cd6',
                               anchor='w', justify='left',
                               wraplength=560)  # 设置自动换行宽度
        prompt_label.pack(anchor='w', pady=(0, 15), fill='x')
        
        # 文本输入区域容器
        text_container = tk.Frame(content_frame, bg='#1e1e1e', relief='solid', bd=1)
        text_container.pack(fill='both', expand=True, pady=(0, 15))
        
        # 文本输入 - 使用VS Code风格配色
        self.text_area = tk.Text(text_container, 
                                height=10, 
                                font=('Consolas', 12),
                                relief='flat', 
                                bd=0, 
                                wrap='none', 
                                undo=True, 
                                maxundo=20,
                                bg='#1e1e1e',         # VS Code深色背景
                                fg='#d4d4d4',         # 浅灰色文字
                                insertbackground='#ffffff',  # 白色光标
                                selectbackground='#264f78',  # 蓝色选择背景
                                selectforeground='#ffffff')  # 白色选择文字
        
        # 添加滚动条 - 深色主题，默认隐藏
        self.scrollbar_v = tk.Scrollbar(text_container, orient='vertical', 
                                       command=self.text_area.yview,
                                       bg='#3e3e42', troughcolor='#2d2d30',
                                       activebackground='#007acc')
        self.scrollbar_h = tk.Scrollbar(text_container, orient='horizontal', 
                                       command=self.text_area.xview,
                                       bg='#3e3e42', troughcolor='#2d2d30',
                                       activebackground='#007acc')
        
        # 配置滚动条
        self.text_area.config(yscrollcommand=self.on_text_scroll_v, 
                             xscrollcommand=self.on_text_scroll_h)
        
        # 布局
        self.text_area.pack(side='left', fill='both', expand=True)
        
        # 底部信息和按钮区域
        info_frame = tk.Frame(content_frame, bg='#2d2d30')
        info_frame.pack(fill='x', pady=(5, 0))
        
        # 提示信息 - 简化快捷键提示
        hint_label = tk.Label(info_frame, 
                             text="💡 Ctrl+Enter 提交  •  Esc 取消  •  Ctrl+A 全选",
                             font=('Consolas', 9), 
                             bg='#2d2d30', fg='#808080')
        hint_label.pack(side='left')
        
        # 按钮区域
        button_frame = tk.Frame(info_frame, bg='#2d2d30')
        button_frame.pack(side='right')
        
        # 取消按钮 - 灰色主题
        cancel_btn = tk.Button(button_frame, text="取消", command=self.on_cancel,
                              font=('Consolas', 10), width=8,
                              bg='#3e3e42', fg='#cccccc',
                              relief='flat', bd=1,
                              activebackground='#4e4e52',
                              activeforeground='#ffffff',
                              cursor='hand2')
        cancel_btn.pack(side='right', padx=(10, 0))
        
        # 完成按钮 - 蓝色主题
        self.submit_btn = tk.Button(button_frame, text="完成", command=self.on_submit,
                              font=('Consolas', 10, 'bold'), width=12,
                              bg='#007acc', fg='white',
                              relief='flat', bd=1,
                              activebackground='#005a9e',
                              activeforeground='#ffffff',
                              cursor='hand2')
        self.submit_btn.pack(side='right')
        
        # 占位符设置
        self.placeholder_text = "在此输入您的内容..."
        self.is_placeholder = True
        self.show_placeholder()
        
        # 初始更新按钮文案（可能包含倒计时）
        self.update_submit_button_label()
    
    def on_text_scroll_v(self, *args):
        """垂直滚动条回调，自动显示/隐藏"""
        self.scrollbar_v.set(*args)
        self.auto_show_hide_scrollbars()
    
    def on_text_scroll_h(self, *args):
        """水平滚动条回调，自动显示/隐藏"""
        self.scrollbar_h.set(*args)
        self.auto_show_hide_scrollbars()
    
    def auto_show_hide_scrollbars(self):
        """自动显示/隐藏滚动条"""
        # 检查是否需要垂直滚动条
        v_pos = self.scrollbar_v.get()
        if v_pos[0] <= 0.0 and v_pos[1] >= 1.0:
            # 不需要垂直滚动条
            self.scrollbar_v.pack_forget()
        else:
            # 需要垂直滚动条
            self.scrollbar_v.pack(side='right', fill='y')
        
        # 检查是否需要水平滚动条
        h_pos = self.scrollbar_h.get()
        if h_pos[0] <= 0.0 and h_pos[1] >= 1.0:
            # 不需要水平滚动条
            self.scrollbar_h.pack_forget()
        else:
            # 需要水平滚动条
            self.scrollbar_h.pack(side='bottom', fill='x')
    
    def setup_bindings(self):
        # 绑定事件
        self.text_area.focus_set()
        self.root.bind('<Control-Return>', self.handle_ctrl_enter)
        self.root.bind('<Escape>', lambda e: self.on_cancel())
        self.root.protocol("WM_DELETE_WINDOW", self.on_cancel)
        
        # 鼠标进入窗口终止倒计时（按需）。不在获得焦点时终止，避免初始显示即终止
        self.root.bind('<Enter>', lambda e: self.terminate_countdown())
        
        # 添加撤销重做快捷键
        self.root.bind('<Control-z>', lambda e: self.undo_text())
        self.root.bind('<Control-y>', lambda e: self.redo_text())
        self.root.bind('<Control-Shift-Z>', lambda e: self.redo_text())  # 支持Shift+Ctrl+Z重做
        
        # 自定义全选功能
        self.text_area.bind('<Control-a>', self.select_all_text)
        
        # 文本框事件绑定
        self.text_area.bind('<FocusIn>', self.on_text_focus_in)
        self.text_area.bind('<FocusOut>', self.on_text_focus_out)
        self.text_area.bind('<KeyPress>', self.on_key_press)
        # 文本内容修改时终止倒计时
        self.text_area.bind('<<Modified>>', self.on_text_modified)
        
        # 绑定文本变化事件，用于滚动条自动显示/隐藏
        self.text_area.bind('<Configure>', lambda e: self.root.after_idle(self.auto_show_hide_scrollbars))
        self.text_area.bind('<KeyRelease>', lambda e: self.root.after_idle(self.auto_show_hide_scrollbars))
        
        # 默认选中所有文本
        self.root.after(100, self.select_initial_text)
    
    def show_placeholder(self):
        """显示占位符文本"""
        self.text_area.delete('1.0', 'end')
        self.text_area.insert('1.0', self.placeholder_text)
        self.text_area.config(fg='#6a6a6a')  # 深色主题下的占位符颜色
        self.is_placeholder = True
        try:
            self.text_area.edit_modified(False)
        except Exception:
            pass
    
    def clear_placeholder(self):
        """清除占位符文本"""
        if self.is_placeholder:
            self.text_area.delete('1.0', 'end')
            self.text_area.config(fg='#d4d4d4')  # 恢复正常文字颜色
            self.is_placeholder = False
    
    def on_text_focus_in(self, event):
        """文本框获得焦点时"""
        if self.is_placeholder and not self.stdin_content:
            self.clear_placeholder()
    
    def on_text_focus_out(self, event):
        """文本框失去焦点时"""
        content = self.text_area.get('1.0', 'end-1c').strip()
        if not content and not self.stdin_content:
            self.show_placeholder()
    
    def on_key_press(self, event):
        """处理按键事件"""
        # 处理Ctrl+Return组合键
        if event.keysym == 'Return' and event.state & 0x4:  # Control键被按下
            self.handle_ctrl_enter(event)
            return "break"
        
        # 清除占位符
        if self.is_placeholder and event.keysym not in ['Control_L', 'Control_R', 'Alt_L', 'Alt_R', 'Shift_L', 'Shift_R']:
            self.clear_placeholder()
            # 用户开始编辑，终止倒计时
            self.terminate_countdown()
        else:
            # 对于非修饰键的按键，视为编辑，终止倒计时
            if event.keysym not in ['Control_L', 'Control_R', 'Alt_L', 'Alt_R', 'Shift_L', 'Shift_R']:
                self.terminate_countdown()
    
    def select_all_text(self, event):
        """自定义全选功能，只选中实际文本内容"""
        if self.is_placeholder:
            return "break"
        
        content = self.text_area.get('1.0', 'end-1c')
        if content:
            lines = content.split('\n')
            last_line = len(lines)
            last_char = len(lines[-1])
            end_pos = f"{last_line}.{last_char}"
            
            self.text_area.tag_remove('sel', '1.0', 'end')
            self.text_area.tag_add('sel', '1.0', end_pos)
            self.text_area.mark_set('insert', end_pos)
        
        return "break"
    
    def on_text_modified(self, event):
        """文本内容修改事件，终止倒计时并重置modified标志"""
        try:
            if self.text_area.edit_modified():
                self.terminate_countdown()
                self.text_area.edit_modified(False)
        except Exception:
            # 兼容处理，若edit_modified不可用则忽略
            pass

    def select_initial_text(self):
        """初始选中文本，方便用户直接输入"""
        if self.is_placeholder and not self.stdin_content:
            self.text_area.tag_add('sel', '1.0', f'1.{len(self.placeholder_text)}')
            self.text_area.mark_set('insert', '1.0')
    
    def undo_text(self):
        """撤销操作"""
        try:
            self.text_area.event_generate('<<Undo>>')
        except:
            pass
    
    def redo_text(self):
        """重做操作"""
        try:
            self.text_area.event_generate('<<Redo>>')
        except:
            pass
    
    def handle_ctrl_enter(self, event):
        """处理Ctrl+Enter键盘事件"""
        content_before_submit = self.text_area.get('1.0', 'end-1c')
        
        # 确保内容不为空或只是换行符
        if content_before_submit.strip():
            self.on_submit()
        else:
            messagebox.showwarning("提示", "请输入内容后再提交！")
            
        return "break"  # 阻止默认行为
    
    def on_submit(self):
        # 获取文本框内容
        content = self.text_area.get("1.0", "end-1c")
        
        # 检查是否为占位符内容
        if self.is_placeholder or content.strip() == self.placeholder_text.strip():
            messagebox.showwarning("提示", "请输入内容后再提交！")
            self.text_area.focus_set()
            return
        
        self.result = content
        self.terminate_countdown()
        self.root.quit()
        self.root.destroy()
    
    def on_cancel(self):
        self.result = None
        self.terminate_countdown()
        self.root.quit()
        self.root.destroy()
    
    def show(self):
        self.root.mainloop()
        return self.result

    # ==================== 倒计时相关 ====================
    def start_countdown(self):
        """启动完成按钮倒计时"""
        if self.countdown_active:
            return
        self.countdown_active = True
        self.update_submit_button_label()
        self.schedule_next_tick()

    def schedule_next_tick(self):
        if not self.countdown_active:
            return
        if self.countdown_remaining_seconds <= 0:
            # 倒计时结束，恢复按钮文案
            self.countdown_active = False
            self.update_submit_button_label()
            # 方案B：倒计时结束自动提交（若内容有效且未被中止）
            self.auto_submit_on_timeout()
            return
        # 安排下一秒的更新
        self.countdown_after_id = self.root.after(1000, self.tick_countdown)

    def tick_countdown(self):
        if not self.countdown_active:
            return
        self.countdown_remaining_seconds -= 1
        if self.countdown_remaining_seconds < 0:
            self.countdown_remaining_seconds = 0
        self.update_submit_button_label()
        self.schedule_next_tick()

    def terminate_countdown(self):
        """终止倒计时（用户编辑时调用）"""
        if self.countdown_active:
            self.countdown_active = False
            if self.countdown_after_id is not None:
                try:
                    self.root.after_cancel(self.countdown_after_id)
                except Exception:
                    pass
                self.countdown_after_id = None
            self.update_submit_button_label()

    def update_submit_button_label(self):
        """根据倒计时状态更新完成按钮文字"""
        if not hasattr(self, 'submit_btn'):
            return
        if self.countdown_active and self.countdown_remaining_seconds > 0:
            self.submit_btn.config(text=f"完成({self.countdown_remaining_seconds}s)")
        else:
            self.submit_btn.config(text="完成")

    def auto_submit_on_timeout(self):
        """倒计时结束后的自动提交逻辑（方案B）"""
        try:
            # 若倒计时已经被其他交互终止，则不执行
            if self.countdown_active:
                return
            # 校验内容有效性
            content = self.text_area.get("1.0", "end-1c")
            if not content.strip():
                # 空内容不自动提交，仅停止倒计时
                return
            if self.is_placeholder or content.strip() == self.placeholder_text.strip():
                # 占位符不自动提交
                return
            # 自动执行提交
            self.on_submit()
        except Exception:
            # 保守处理：任何异常都不影响窗口正常可用
            pass


def check_stdin_input():
    """检查是否有stdin输入"""
    try:
        # 检查stdin是否不是终端（即通过管道或重定向输入）
        if not sys.stdin.isatty():
            # 在Windows环境下，尝试用二进制方式读取stdin
            if os.name == 'nt':
                try:
                    # 获取二进制stdin
                    import msvcrt
                    import io
                    
                    # 尝试读取二进制数据
                    binary_stdin = io.open(sys.stdin.fileno(), 'rb')
                    content_bytes = binary_stdin.read()
                    
                    # 尝试不同的编码方式
                    for encoding in ['utf-8', 'gbk', 'gb2312', 'cp936']:
                        try:
                            content = content_bytes.decode(encoding)
                            break
                        except UnicodeDecodeError:
                            continue
                    else:
                        # 如果所有编码都失败，使用错误替换
                        content = content_bytes.decode('utf-8', errors='replace')
                        
                except Exception:
                    # 如果二进制读取失败，回退到文本模式
                    content = sys.stdin.read()
            else:
                # 非Windows系统，直接读取
                content = sys.stdin.read()
            
            return content.rstrip('\n\r') if content else None
    except Exception as e:
        # 调试信息
        print(f"Error reading stdin: {e}", file=sys.stderr)
    return None


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="现代化命令行文字输入工具 - 自定义标题栏版本")
    parser.add_argument("prompt", nargs='?', default="请输入您的内容：", 
                       help="显示在窗口中的提示信息")
    parser.add_argument("--countdown", "-c", type=int, default=60,
                       help="完成按钮倒计时秒数，默认60秒。传0关闭倒计时。")
    parser.add_argument("--version", action="version", version="3.1.0")
    
    args = parser.parse_args()
    
    try:
        # 检查stdin输入
        stdin_content = check_stdin_input()
        
        # 创建并显示输入窗口
        window = ModernPromptInputWindow(args.prompt, stdin_content, args.countdown)
        result = window.show()
        
        # 输出结果
        if result is not None:
            print(result)
        else:
            print("用户取消了输入", file=sys.stderr)
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n程序被用户中断", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"程序运行出错: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main() 
