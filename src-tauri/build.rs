use std::fs;
use std::path::{Path, PathBuf};

fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(&entry.path(), &dst.join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.join(entry.file_name()))?;
        }
    }
    Ok(())
}

fn main() {
    tauri_build::build();

    // Ensure fr.lproj and Info.plist are present beside development binaries
    // so macOS AppKit recognizes French localization even when running unbundled (tauri dev)
    if let Ok(out_dir) = std::env::var("OUT_DIR") {
        let out_path = PathBuf::from(out_dir);
        if let Some(bin_dir) = out_path.ancestors().nth(3) {
            let _ = copy_dir_all(Path::new("resources/fr.lproj"), &bin_dir.join("fr.lproj"));
            let _ = fs::copy("Info.plist", bin_dir.join("Info.plist"));
        }
    }
}
