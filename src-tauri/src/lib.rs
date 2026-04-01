use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    Emitter,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .menu(|app| {
            // Create About menu item
            let about_item = MenuItem::with_id(
                app,
                "about",
                "About Roshi",
                true,
                None::<&str>,
            )
            .unwrap();

            // Separator
            let separator = PredefinedMenuItem::separator(app).unwrap();

            // GitHub repo link
            let github_repo = MenuItem::with_id(
                app,
                "github-repo",
                "GitHub Repository",
                true,
                None::<&str>,
            )
            .unwrap();

            // Author profile link
            let author_profile = MenuItem::with_id(
                app,
                "author",
                "Author Profile",
                true,
                None::<&str>,
            )
            .unwrap();

            let app_menu = Submenu::with_items(
                app,
                "Roshi",
                true,
                &[&about_item, &separator, &github_repo, &author_profile],
            )
            .unwrap();

            Ok(Menu::with_items(app, &[&app_menu]).unwrap())
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
