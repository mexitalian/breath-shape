// Menu-bar app: the breathing web app in a panel that drops down from a tray icon.
//
//   left click / ⌥⌘B  show or hide the panel under the icon
//   right click       Float window · Launch at login · Quit
//
// "Float window" turns the panel into a normal, movable window that stays on top of
// other apps and doesn't hide when you click elsewhere, for breathing while you work.

use std::sync::atomic::{AtomicBool, Ordering};

use tauri::image::Image;
use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, WindowEvent};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};
use tauri_plugin_global_shortcut::ShortcutState;
use tauri_plugin_positioner::{Position, WindowExt};

static FLOATING: AtomicBool = AtomicBool::new(false);

fn toggle_panel(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else { return };
    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
        return;
    }
    if !FLOATING.load(Ordering::Relaxed) {
        let _ = window.move_window(Position::TrayBottomCenter);
    }
    let _ = window.show();
    let _ = window.set_focus();
}

fn set_floating(app: &AppHandle, floating: bool) {
    FLOATING.store(floating, Ordering::Relaxed);
    let Some(window) = app.get_webview_window("main") else { return };
    // Floating: a title bar to move and resize it. Panel: frameless, under the icon.
    let _ = window.set_decorations(floating);
    let _ = window.set_resizable(floating);
    if floating {
        let _ = window.move_window(Position::TopRight);
        let _ = window.show();
        let _ = window.set_focus();
    } else {
        let _ = window.hide();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcuts(["Alt+Super+B"])
                .expect("valid shortcut")
                .with_handler(|app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        toggle_panel(app);
                    }
                })
                .build(),
        )
        .setup(|app| {
            // Menu-bar only: no Dock icon, no app menu.
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let launch_at_login = app.autolaunch().is_enabled().unwrap_or(false);
            let float = CheckMenuItem::with_id(app, "float", "Float window", true, false, None::<&str>)?;
            let login = CheckMenuItem::with_id(app, "login", "Launch at login", true, launch_at_login, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit Breathing", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&float, &login, &PredefinedMenuItem::separator(app)?, &quit])?;

            TrayIconBuilder::with_id("tray")
                .icon(Image::from_bytes(include_bytes!("../icons/tray.png"))?)
                .icon_as_template(true)
                .tooltip("Breathing (⌥⌘B)")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "float" => set_floating(app, float.is_checked().unwrap_or(false)),
                    "login" => {
                        let autolaunch = app.autolaunch();
                        let _ = if login.is_checked().unwrap_or(false) { autolaunch.enable() } else { autolaunch.disable() };
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        toggle_panel(tray.app_handle());
                    }
                })
                .build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| match event {
            // The panel hides when you click elsewhere, like a menu.
            WindowEvent::Focused(false) if !FLOATING.load(Ordering::Relaxed) => {
                let _ = window.hide();
            }
            // Closing the floating window hides it; the app keeps running in the menu bar.
            WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let _ = window.hide();
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running Breathing");
}
