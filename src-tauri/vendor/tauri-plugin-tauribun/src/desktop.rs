use serde::de::DeserializeOwned;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{plugin::PluginApi, AppHandle, Emitter, Manager, Runtime};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::Mutex;

use crate::error::Error;
use crate::models::*;

/// Represents an active sidecar process
struct SidecarProcess {
    /// The child process handle
    child: Child,
    /// Sender to write to stdin
    stdin_tx: tokio::sync::mpsc::Sender<String>,
}

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<Tauribun<R>> {
    Ok(Tauribun {
        app: app.clone(),
        sidecars: Arc::new(Mutex::new(HashMap::new())),
    })
}

/// Access to the tauribun APIs.
pub struct Tauribun<R: Runtime> {
    app: AppHandle<R>,
    sidecars: Arc<Mutex<HashMap<String, SidecarProcess>>>,
}

impl<R: Runtime> Tauribun<R> {
    pub fn ping(&self, payload: PingRequest) -> crate::Result<PingResponse> {
        Ok(PingResponse {
            value: payload.value,
        })
    }

    /// Get the path to a sidecar binary
    fn get_sidecar_path(&self, binary_path: &str) -> crate::Result<PathBuf> {
        // Get target triple for platform-specific binary naming
        let target_triple = tauri::utils::platform::target_triple()
            .map_err(|e| Error::BinaryNotFound(format!("Failed to get target triple: {}", e)))?;

        // Extract just the binary name without any directory prefix (e.g., "binaries/bun-server" -> "bun-server")
        let binary_name = std::path::Path::new(binary_path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or(binary_path);

        // Build the suffixed binary name (Tauri's sidecar naming convention)
        let suffixed_name = if cfg!(target_os = "windows") {
            format!("{}-{}.exe", binary_path, target_triple)
        } else {
            format!("{}-{}", binary_path, target_triple)
        };

        // Build the unsuffixed binary name (for bundled apps where Tauri strips the suffix)
        let unsuffixed_name = if cfg!(target_os = "windows") {
            format!("{}.exe", binary_name)
        } else {
            binary_name.to_string()
        };

        log::info!(
            "Looking for sidecar: binary_path={}, binary_name={}, suffixed={}, unsuffixed={}",
            binary_path,
            binary_name,
            suffixed_name,
            unsuffixed_name
        );

        // Try multiple locations where the sidecar might be
        let mut search_paths = Vec::new();

        // 1. Check resource directory (production builds)
        if let Ok(resource_dir) = self.app.path().resource_dir() {
            log::info!("Resource dir: {:?}", resource_dir);
            search_paths.push(resource_dir.join(&suffixed_name));
            search_paths.push(resource_dir.join(&unsuffixed_name));
        }

        // 2. Check relative to the current executable (for development and bundled apps)
        if let Ok(exe_path) = std::env::current_exe() {
            log::info!("Executable path: {:?}", exe_path);
            if let Some(exe_dir) = exe_path.parent() {
                // In development: executable is in target/debug/, binaries are in src-tauri/binaries/
                // Go up from target/debug to src-tauri (binary_path already includes "binaries/" prefix)
                let src_tauri_dir = exe_dir.join("../..");
                search_paths.push(src_tauri_dir.join(&suffixed_name));

                // In bundled apps, the binary is next to the executable without the "binaries/" prefix
                // Check with suffix
                search_paths.push(exe_dir.join(&suffixed_name));
                // Check without suffix (macOS bundled apps strip the target triple)
                search_paths.push(exe_dir.join(&unsuffixed_name));
            }
        }

        // 3. Check TAURI_SIDECAR environment variable if set during build
        if let Ok(sidecar_path) = std::env::var(format!(
            "TAURI_SIDECAR_{}",
            binary_path.to_uppercase().replace(['/', '-'], "_")
        )) {
            search_paths.insert(0, PathBuf::from(sidecar_path));
        }

        log::info!("Searching for sidecar in {} paths", search_paths.len());

        // Search through all paths
        for path in &search_paths {
            log::info!("Checking path: {:?}", path);
            let canonical = path.canonicalize().unwrap_or_else(|_| path.clone());
            if canonical.exists() {
                log::info!("Found sidecar at {:?}", canonical);
                return Ok(canonical);
            }
        }

        Err(Error::BinaryNotFound(format!(
            "Sidecar '{}' not found. Searched paths:\n{}",
            binary_path,
            search_paths
                .iter()
                .map(|p| format!("  - {:?}", p))
                .collect::<Vec<_>>()
                .join("\n")
        )))
    }

    /// Spawn a new sidecar server
    pub async fn spawn_server(
        &self,
        payload: SpawnServerRequest,
    ) -> crate::Result<SpawnServerResponse> {
        let name = payload.name.clone();

        // Check if server already exists
        {
            let sidecars = self.sidecars.lock().await;
            if sidecars.contains_key(&name) {
                return Err(Error::ServerAlreadyExists(name));
            }
        }

        // Get the sidecar binary path
        let sidecar_path = self.get_sidecar_path(&payload.binary_path)?;

        log::info!("Spawning sidecar '{}' from {:?}", name, sidecar_path);

        // Spawn the process. On Windows this app is a GUI-subsystem binary
        // (no console), so spawning the console-subsystem Bun sidecar without
        // CREATE_NO_WINDOW would make Windows allocate a brand-new console and
        // pop a black cmd window next to the app. stdio is piped below, so
        // hiding the console is safe and the JSON-lines bridge still works.
        let mut command = Command::new(&sidecar_path);
        command
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped());
        #[cfg(windows)]
        {
            // 0x0800_0000 = CREATE_NO_WINDOW (std::os::windows::process::CommandExt)
            command.creation_flags(0x0800_0000);
        }
        let mut child = command
            .spawn()
            .map_err(|e| Error::SpawnFailed(e.to_string()))?;

        // Take stdin and stdout
        let stdin = child
            .stdin
            .take()
            .ok_or_else(|| Error::SpawnFailed("Failed to capture stdin".to_string()))?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| Error::SpawnFailed("Failed to capture stdout".to_string()))?;
        let stderr = child
            .stderr
            .take()
            .ok_or_else(|| Error::SpawnFailed("Failed to capture stderr".to_string()))?;

        // Create a channel for sending messages to stdin
        let (stdin_tx, mut stdin_rx) = tokio::sync::mpsc::channel::<String>(100);

        // Spawn a task to write to stdin
        tokio::spawn(async move {
            let mut stdin = stdin;
            while let Some(message) = stdin_rx.recv().await {
                if let Err(e) = stdin.write_all(message.as_bytes()).await {
                    log::error!("Failed to write to stdin: {}", e);
                    break;
                }
                if let Err(e) = stdin.flush().await {
                    log::error!("Failed to flush stdin: {}", e);
                    break;
                }
            }
        });

        // Spawn a task to read stdout and handle RPC messages vs logs
        let app_handle = self.app.clone();
        let server_name = name.clone();
        tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();

            while let Ok(Some(line)) = lines.next_line().await {
                if line.contains("__ORPC__") {
                    // RPC message - emit as event for the frontend
                    let event_name = format!("tauribun://{}/message", server_name);
                    if let Err(e) = app_handle.emit(&event_name, &line) {
                        log::error!("Failed to emit event: {}", e);
                    }
                } else {
                    // Log message - print to terminal
                    let trimmed = line.trim();
                    if !trimmed.is_empty() {
                        log::info!("[{}] {}", server_name, trimmed);
                    }
                }
            }
        });

        // Spawn a task to read stderr and log it
        let server_name_stderr = name.clone();
        tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();

            while let Ok(Some(line)) = lines.next_line().await {
                log::warn!("[{}] stderr: {}", server_name_stderr, line);
            }
        });

        // Store the sidecar
        {
            let mut sidecars = self.sidecars.lock().await;
            sidecars.insert(name.clone(), SidecarProcess { child, stdin_tx });
        }

        log::info!("Sidecar '{}' spawned successfully", name);

        Ok(SpawnServerResponse {
            success: true,
            name,
        })
    }

    /// Send a message to a sidecar's stdin
    pub async fn send_message(
        &self,
        payload: SendMessageRequest,
    ) -> crate::Result<SendMessageResponse> {
        let sidecars = self.sidecars.lock().await;

        let sidecar = sidecars
            .get(&payload.name)
            .ok_or_else(|| Error::ServerNotFound(payload.name.clone()))?;

        // Send the message through the channel
        sidecar
            .stdin_tx
            .send(payload.message)
            .await
            .map_err(|e| Error::SendFailed(e.to_string()))?;

        Ok(SendMessageResponse { success: true })
    }

    /// Kill a sidecar server
    pub async fn kill_server(
        &self,
        payload: KillServerRequest,
    ) -> crate::Result<KillServerResponse> {
        let mut sidecars = self.sidecars.lock().await;

        let mut sidecar = sidecars
            .remove(&payload.name)
            .ok_or_else(|| Error::ServerNotFound(payload.name.clone()))?;

        // Kill the child process
        sidecar
            .child
            .kill()
            .await
            .map_err(|e| Error::KillFailed(e.to_string()))?;

        log::info!("Sidecar '{}' killed successfully", payload.name);

        Ok(KillServerResponse { success: true })
    }
}
