use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    Emitter,
};
use tauri_plugin_opener::OpenerExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
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

            let website = MenuItem::with_id(
                app,
                "website",
                "Website",
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
                    &website,
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
                "website" => {
                    let _ = app.opener().open_url("https://roshi.mmc.dev", None::<&str>);
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
