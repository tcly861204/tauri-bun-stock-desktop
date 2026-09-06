const COMMANDS: &[&str] = &["ping", "spawn_server", "send_message", "kill_server"];

fn main() {
    tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .build();
}
