#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .menu(tauri::menu::Menu::default)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
