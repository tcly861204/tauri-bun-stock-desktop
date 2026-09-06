use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

pub use models::*;

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

mod commands;
mod error;
mod models;

pub use error::{Error, Result};

#[cfg(desktop)]
use desktop::Tauribun;
#[cfg(mobile)]
use mobile::Tauribun;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the tauribun APIs.
pub trait TauribunExt<R: Runtime> {
    fn tauribun(&self) -> &Tauribun<R>;
}

impl<R: Runtime, T: Manager<R>> crate::TauribunExt<R> for T {
    fn tauribun(&self) -> &Tauribun<R> {
        self.state::<Tauribun<R>>().inner()
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("tauribun")
        .invoke_handler(tauri::generate_handler![
            commands::ping,
            commands::spawn_server,
            commands::send_message,
            commands::kill_server
        ])
        .setup(|app, api| {
            #[cfg(mobile)]
            let tauribun = mobile::init(app, api)?;
            #[cfg(desktop)]
            let tauribun = desktop::init(app, api)?;
            app.manage(tauribun);
            Ok(())
        })
        .build()
}
