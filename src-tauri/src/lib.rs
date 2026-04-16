use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    Emitter,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .menu(|app| {
            // --- App menu ---
            let about_item = MenuItem::with_id(
                app,
                "about",
                "About Roshi",
                true,
                None::<&str>,
            )
            .unwrap();

            let separator = PredefinedMenuItem::separator(app).unwrap();

            let github_repo = MenuItem::with_id(
                app,
                "github-repo",
                "GitHub Repository",
                true,
                None::<&str>,
            )
            .unwrap();

            let author_profile = MenuItem::with_id(
                app,
                "author",
                "Author Profile",
                true,
                None::<&str>,
            )
            .unwrap();

            let hide = PredefinedMenuItem::hide(app, Some("Hide Roshi")).unwrap();
            let hide_others = PredefinedMenuItem::hide_others(app, None).unwrap();
            let show_all = PredefinedMenuItem::show_all(app, None).unwrap();
            let quit = PredefinedMenuItem::quit(app, Some("Quit Roshi")).unwrap();

            let app_menu = Submenu::with_items(
                app,
                "Roshi",
                true,
                &[
                    &about_item,
                    &separator,
                    &github_repo,
                    &author_profile,
                    &PredefinedMenuItem::separator(app).unwrap(),
                    &hide,
                    &hide_others,
                    &show_all,
                    &PredefinedMenuItem::separator(app).unwrap(),
                    &quit,
                ],
            )
            .unwrap();

            // --- Edit menu (enables clipboard shortcuts in WebView) ---
            let undo = PredefinedMenuItem::undo(app, None).unwrap();
            let redo = PredefinedMenuItem::redo(app, None).unwrap();
            let cut = PredefinedMenuItem::cut(app, None).unwrap();
            let copy = PredefinedMenuItem::copy(app, None).unwrap();
            let paste = PredefinedMenuItem::paste(app, None).unwrap();
            let select_all = PredefinedMenuItem::select_all(app, None).unwrap();

            let edit_menu = Submenu::with_items(
                app,
                "Edit",
                true,
                &[
                    &undo,
                    &redo,
                    &PredefinedMenuItem::separator(app).unwrap(),
                    &cut,
                    &copy,
                    &paste,
                    &PredefinedMenuItem::separator(app).unwrap(),
                    &select_all,
                ],
            )
            .unwrap();

            // --- Window menu ---
            let minimize = PredefinedMenuItem::minimize(app, None).unwrap();
            let maximize = PredefinedMenuItem::maximize(app, None).unwrap();
            let close_window = PredefinedMenuItem::close_window(app, Some("Close")).unwrap();
            let fullscreen = PredefinedMenuItem::fullscreen(app, None).unwrap();

            let window_menu = Submenu::with_items(
                app,
                "Window",
                true,
                &[
                    &minimize,
                    &maximize,
                    &fullscreen,
                    &PredefinedMenuItem::separator(app).unwrap(),
                    &close_window,
                ],
            )
            .unwrap();

            Ok(Menu::with_items(app, &[&app_menu, &edit_menu, &window_menu]).unwrap())
        })
        .on_menu_event(|app, event| {
            match event.id.as_ref() {
                "about" => {
                    let _ = app.emit("show-about", ());
                }
                "github-repo" => {
                    _ = open::that("https://github.com/andrewmmc/roshi");
                }
                "author" => {
                    _ = open::that("https://github.com/andrewmmc");
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
