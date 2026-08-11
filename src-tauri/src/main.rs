// [INPUT]: 依赖 tauri 运行时与命令注册、rfd 保存对话框、std 文件系统/进程能力及 tauri.conf/capabilities 配置
// [POS]: Tauri 原生外壳唯一入口。前端 100% 客户端渲染，Rust 侧只提供
//        Web 环境拿不到的两件事：原生保存对话框写盘、系统文件管理器定位
//        (macOS Finder / Windows 资源管理器 / Linux xdg-open)。
// [OUTPUT]: 两个 invoke 命令 save_png / reveal_path
// [SYNC]: 新增命令时同步 generate_handler!、前端 desktopBridge 与 capabilities/default.json。
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::process::Command;
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
use std::path::{Path, PathBuf};

// 弹出原生保存对话框，用户选定后写入 PNG 字节；取消返回 None
#[tauri::command]
async fn save_png(bytes: Vec<u8>, default_name: String) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let Some(path) = rfd::FileDialog::new()
            .set_title("导出书摘图片")
            .set_file_name(&default_name)
            .add_filter("PNG 图片", &["png"])
            .save_file()
        else {
            return Ok(None);
        };
        fs::write(&path, &bytes).map_err(|error| error.to_string())?;
        Ok(Some(path.to_string_lossy().to_string()))
    })
    .await
    .map_err(|error| error.to_string())?
}

// 在 Finder / 资源管理器 / 文件管理器中定位已导出的文件
#[tauri::command]
async fn reveal_path(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("-R")
            .arg(&path)
            .status()
            .map_err(|error| error.to_string())?;
        Ok(())
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(format!("/select,{path}"))
            .status()
            .map_err(|error| error.to_string())?;
        Ok(())
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let target = PathBuf::from(&path);
        let folder = target.parent().unwrap_or_else(|| Path::new("."));
        Command::new("xdg-open")
            .arg(folder)
            .status()
            .map_err(|error| error.to_string())?;
        Ok(())
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![save_png, reveal_path])
        .run(tauri::generate_context!())
        .expect("failed to run Excerpt Studio");
}
