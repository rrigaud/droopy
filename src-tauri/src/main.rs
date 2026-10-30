// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::path::Path;
use std::time::Duration;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use tauri::command;

#[command]
fn select_folder(default_path: Option<String>) -> Result<Option<String>, String> {
    let mut dialog = rfd::FileDialog::new();
    dialog = dialog.set_title("Sélectionner un dossier");
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
    let title_str = title.unwrap_or_else(|| "Sélectionner un fichier".to_string());
    dialog = dialog.set_title(title_str);
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
fn save_file(
    title: Option<String>,
    default_name: Option<String>,
    filter_name: Option<String>,
    filter_exts: Option<Vec<String>>,
    default_path: Option<String>,
) -> Result<Option<String>, String> {
    let mut dialog = rfd::FileDialog::new();
    let title_str = title.unwrap_or_else(|| "Enregistrer sous".to_string());
    dialog = dialog.set_title(title_str);
    if let Some(n) = default_name {
        dialog = dialog.set_file_name(n);
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
    let res = dialog.save_file();
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

#[command]
fn get_dropbox_root() -> Result<Option<String>, String> {
    let home = std::env::var("HOME").unwrap_or_else(|_| "".to_string());
    if home.is_empty() {
        return Ok(None);
    }

    // 1. Essai de lecture de ~/.dropbox/info.json
    let info_path = format!("{}/.dropbox/info.json", home);
    if let Ok(content) = fs::read_to_string(&info_path) {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(p) = v.get("personal").and_then(|o| o.get("path")).and_then(|s| s.as_str()) {
                if Path::new(p).exists() {
                    return Ok(Some(p.to_string()));
                }
            }
            if let Some(p) = v.get("business").and_then(|o| o.get("path")).and_then(|s| s.as_str()) {
                if Path::new(p).exists() {
                    return Ok(Some(p.to_string()));
                }
            }
        }
    }

    // 2. Fallbacks classiques sur macOS
    let standard_paths = [
        format!("{}/Library/CloudStorage/Dropbox", home),
        format!("{}/Dropbox", home),
    ];

    for p in standard_paths {
        let path = Path::new(&p);
        if path.exists() {
            if let Ok(canon) = fs::canonicalize(path) {
                return Ok(Some(canon.to_string_lossy().to_string()));
            }
            return Ok(Some(p));
        }
    }

    Ok(None)
}

#[command]
fn start_dropbox_oauth_listener(auth_url: String) -> Result<String, String> {
    let listener = TcpListener::bind("127.0.0.1:52478")
        .map_err(|e| format!("Impossible d'écouter sur le port 52478: {}. Vérifiez qu'aucune autre instance de Droopy n'est en cours.", e))?;
    listener.set_nonblocking(true).map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    let _ = std::process::Command::new("open").arg(&auth_url).spawn();
    #[cfg(target_os = "windows")]
    let _ = std::process::Command::new("cmd").args(["/C", "start", &auth_url]).spawn();
    #[cfg(target_os = "linux")]
    let _ = std::process::Command::new("xdg-open").arg(&auth_url).spawn();

    let start = std::time::Instant::now();
    let timeout = Duration::from_secs(120);

    loop {
        if start.elapsed() > timeout {
            return Err("Délai d'autorisation Dropbox dépassé (120 s). Veuillez réessayer.".to_string());
        }

        match listener.accept() {
            Ok((mut stream, _)) => {
                let _ = stream.set_read_timeout(Some(Duration::from_secs(5)));
                let mut buffer = [0u8; 2048];
                let n = stream.read(&mut buffer).unwrap_or(0);
                let request = String::from_utf8_lossy(&buffer[..n]);

                let code = if let Some(pos) = request.find("code=") {
                    let after = &request[pos + 5..];
                    let end_pos = after.find(|c| c == ' ' || c == '&' || c == '\r' || c == '\n').unwrap_or(after.len());
                    Some(after[..end_pos].to_string())
                } else {
                    None
                };

                let response_body = if code.is_some() {
                    r#"<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Droopy - Connexion réussie</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;text-align:center;padding:50px;background:#f8fafc;color:#1e293b;">
  <div style="max-width:440px;margin:auto;background:white;padding:36px;border-radius:16px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.08);border:1px solid #e2e8f0;">
    <h2 style="color:#2563eb;margin-top:0;">✅ Connexion réussie !</h2>
    <p style="font-size:15px;line-height:1.5;">Votre compte Dropbox est désormais connecté à <strong>Droopy</strong>.</p>
    <p style="color:#64748b;font-size:13px;margin-top:20px;">Vous pouvez fermer cet onglet et revenir sur l'application.</p>
  </div>
</body>
</html>"#
                } else {
                    r#"<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Droopy - Connexion</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;text-align:center;padding:50px;background:#f8fafc;color:#1e293b;">
  <div style="max-width:440px;margin:auto;background:white;padding:36px;border-radius:16px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.08);border:1px solid #e2e8f0;">
    <h2 style="color:#dc2626;margin-top:0;">❌ Autorisation annulée</h2>
    <p style="font-size:15px;line-height:1.5;">Aucun code d'autorisation n'a été reçu.</p>
  </div>
</body>
</html>"#
                };

                let response = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                    response_body.len(),
                    response_body
                );
                let _ = stream.write_all(response.as_bytes());
                let _ = stream.flush();

                if let Some(c) = code {
                    return Ok(c);
                } else {
                    return Err("L'autorisation a été annulée ou aucun code reçu.".to_string());
                }
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                std::thread::sleep(Duration::from_millis(150));
            }
            Err(e) => return Err(format!("Erreur écoute Dropbox: {}", e)),
        }
    }
}

#[command]
fn open_path(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    let _ = std::process::Command::new("open").arg(&path).spawn();

    #[cfg(target_os = "windows")]
    let _ = std::process::Command::new("explorer").arg(&path).spawn();

    #[cfg(target_os = "linux")]
    let _ = std::process::Command::new("xdg-open").arg(&path).spawn();

    Ok(())
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
struct OnlinePortalVersion {
    #[serde(rename = "updatedAt")]
    updated_at: Option<String>,
    #[serde(rename = "studentCount")]
    student_count: Option<usize>,
}

#[command]
async fn check_online_portal_version(portal_url: String) -> Result<Option<String>, String> {
    let clean_url = portal_url.trim().trim_end_matches('/');
    if clean_url.is_empty() || !clean_url.starts_with("http") {
        return Ok(None);
    }
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let target_url = format!("{}/version.json?_t={}", clean_url, timestamp);

    let client = match reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
    {
        Ok(c) => c,
        Err(e) => return Err(e.to_string()),
    };

    let resp = match client.get(&target_url).send().await {
        Ok(r) => r,
        Err(_) => return Ok(None),
    };

    if !resp.status().is_success() {
        return Ok(None);
    }

    let parsed = match resp.json::<OnlinePortalVersion>().await {
        Ok(data) => data,
        Err(_) => return Ok(None),
    };

    Ok(parsed.updated_at)
}

#[cfg(target_os = "macos")]
fn init_macos_locale() {
    std::env::set_var("LANG", "fr_FR.UTF-8");
    std::env::set_var("LC_ALL", "fr_FR.UTF-8");
    std::env::set_var("LC_MESSAGES", "fr_FR.UTF-8");
}

fn main() {
    #[cfg(target_os = "macos")]
    init_macos_locale();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            select_folder,
            select_file,
            save_file,
            get_dropbox_root,
            start_dropbox_oauth_listener,
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
            copy_to_clipboard,
            open_path,
            check_online_portal_version
        ])
        .run(tauri::generate_context!())
        .expect("Erreur lors de l'exécution de l'application Droopy");
}
