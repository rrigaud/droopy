// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::Path;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use tauri::command;

#[command]
fn select_folder(default_path: Option<String>) -> Result<Option<String>, String> {
    let mut dialog = rfd::FileDialog::new();
    if let Some(ref p) = default_path {
        if Path::new(p).exists() {
            dialog = dialog.set_directory(p);
        }
    }
    let res = dialog.pick_folder();
    Ok(res.map(|p| p.to_string_lossy().to_string()))
}

#[command]
fn select_file(
    title: Option<String>,
    filter_name: Option<String>,
    filter_exts: Option<Vec<String>>,
    default_path: Option<String>,
) -> Result<Option<String>, String> {
    let mut dialog = rfd::FileDialog::new();
    if let Some(t) = title {
        dialog = dialog.set_title(t);
    }
    if let Some(ref p) = default_path {
        if Path::new(p).exists() {
            dialog = dialog.set_directory(p);
        }
    }
    if let (Some(name), Some(exts)) = (filter_name, filter_exts) {
        let slices: Vec<&str> = exts.iter().map(|s| s.as_str()).collect();
        dialog = dialog.add_filter(name, &slices);
    }
    let res = dialog.pick_file();
    Ok(res.map(|p| p.to_string_lossy().to_string()))
}

#[command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Erreur lecture {}: {}", path, e))
}

#[command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        let _ = fs::create_dir_all(parent);
    }
    fs::write(&path, content).map_err(|e| format!("Erreur écriture {}: {}", path, e))
}

#[command]
fn read_file_base64(path: String) -> Result<String, String> {
    let bytes = fs::read(&path).map_err(|e| format!("Erreur lecture {}: {}", path, e))?;
    Ok(BASE64.encode(bytes))
}

#[command]
fn write_file_base64(path: String, data_base64: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        let _ = fs::create_dir_all(parent);
    }
    let bytes = BASE64.decode(data_base64).map_err(|e| format!("Erreur décodage base64: {}", e))?;
    fs::write(&path, bytes).map_err(|e| format!("Erreur écriture {}: {}", path, e))
}

#[command]
fn check_exists(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).exists())
}

#[command]
fn create_dir(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| format!("Erreur création dossier {}: {}", path, e))
}

#[command]
fn list_subdirs(path: String) -> Result<Vec<String>, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Ok(Vec::new());
    }
    let entries = fs::read_dir(p).map_err(|e| format!("Erreur lecture dossier {}: {}", path, e))?;
    let mut dirs = Vec::new();
    for entry in entries.flatten() {
        if let Ok(file_type) = entry.file_type() {
            if file_type.is_dir() {
                if let Ok(name) = entry.file_name().into_string() {
                    if !name.starts_with('.') {
                        dirs.push(name);
                    }
                }
            }
        }
    }
    dirs.sort();
    Ok(dirs)
}

#[command]
fn list_files(path: String) -> Result<Vec<String>, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Ok(Vec::new());
    }
    let entries = fs::read_dir(p).map_err(|e| format!("Erreur lecture dossier {}: {}", path, e))?;
    let mut files = Vec::new();
    for entry in entries.flatten() {
        if let Ok(file_type) = entry.file_type() {
            if file_type.is_file() {
                if let Ok(name) = entry.file_name().into_string() {
                    if !name.starts_with('.') {
                        files.push(name);
                    }
                }
            }
        }
    }
    files.sort();
    Ok(files)
}

#[command]
fn copy_file(src: String, dst: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&dst).parent() {
        let _ = fs::create_dir_all(parent);
    }
    fs::copy(&src, &dst)
        .map_err(|e| format!("Erreur copie de {} vers {}: {}", src, dst, e))?;
    Ok(())
}

#[command]
fn move_file(src: String, dst: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&dst).parent() {
        let _ = fs::create_dir_all(parent);
    }
    // Rename can fail across filesystems, fallback to copy + delete
    if fs::rename(&src, &dst).is_err() {
        fs::copy(&src, &dst).map_err(|e| format!("Erreur déplacement: {}", e))?;
        let _ = fs::remove_file(&src);
    }
    Ok(())
}

#[command]
fn delete_file(path: String) -> Result<(), String> {
    if Path::new(&path).exists() {
        fs::remove_file(&path).map_err(|e| format!("Erreur suppression {}: {}", path, e))?;
    }
    Ok(())
}

#[command]
fn delete_dir(path: String) -> Result<(), String> {
    if Path::new(&path).exists() {
        fs::remove_dir_all(&path).map_err(|e| format!("Erreur suppression dossier {}: {}", path, e))?;
    }
    Ok(())
}

#[command]
fn copy_to_clipboard(text: String, html: Option<String>) -> Result<(), String> {
    let mut clipboard = arboard::Clipboard::new().map_err(|e| format!("Presse-papier indisponible: {}", e))?;
    if let Some(h) = html {
        clipboard.set_html(h, Some(text)).map_err(|e| format!("Erreur écriture presse-papier HTML: {}", e))
    } else {
        clipboard.set_text(text).map_err(|e| format!("Erreur écriture presse-papier: {}", e))
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            select_folder,
            select_file,
            read_text_file,
            write_text_file,
            read_file_base64,
            write_file_base64,
            check_exists,
            create_dir,
            list_subdirs,
            list_files,
            copy_file,
            move_file,
            delete_file,
            delete_dir,
            copy_to_clipboard
        ])
        .run(tauri::generate_context!())
        .expect("Erreur lors de l'exécution de l'application Droopy");
}
