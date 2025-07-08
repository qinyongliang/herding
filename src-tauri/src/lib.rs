/**
 * @author qinyongliang
 * @date 2024-12-19
 * @description Tauri后端命令处理
 */
use std::env;
use std::process;

// 获取当前工作目录
#[tauri::command]
fn get_current_dir() -> Result<String, String> {
    env::current_dir()
        .map(|path| path.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

// 获取命令行参数中的描述信息
#[tauri::command]
fn get_description_from_args() -> String {
    let args: Vec<String> = env::args().collect();
    
    // 查找 --description 或 -d 参数
    for (i, arg) in args.iter().enumerate() {
        if arg == "--description" || arg == "-d" {
            if i + 1 < args.len() {
                return args[i + 1].clone();
            }
        }
    }
    
    // 默认描述
    "".to_string()
}

// 打印内容到控制台并退出
#[tauri::command]
fn print_and_exit(content: String) {
    println!("{}", content);
    process::exit(0);
}

// 直接退出程序
#[tauri::command]
fn direct_exit() {
    println!("继续");
    process::exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_current_dir,
            get_description_from_args,
            print_and_exit,
            direct_exit
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
