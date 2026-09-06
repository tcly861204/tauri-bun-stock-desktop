use serde::{ser::Serializer, Serialize};

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Io(#[from] std::io::Error),

    #[error("Server '{0}' not found")]
    ServerNotFound(String),

    #[error("Server '{0}' already exists")]
    ServerAlreadyExists(String),

    #[error("Failed to spawn server: {0}")]
    SpawnFailed(String),

    #[error("Failed to send message: {0}")]
    SendFailed(String),

    #[error("Failed to kill server: {0}")]
    KillFailed(String),

    #[error("Sidecar binary not found: {0}")]
    BinaryNotFound(String),

    #[cfg(mobile)]
    #[error(transparent)]
    PluginInvoke(#[from] tauri::plugin::mobile::PluginInvokeError),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn server_not_found_display() {
        let err = Error::ServerNotFound("my-server".to_string());
        assert_eq!(err.to_string(), "Server 'my-server' not found");
    }

    #[test]
    fn server_already_exists_display() {
        let err = Error::ServerAlreadyExists("my-server".to_string());
        assert_eq!(err.to_string(), "Server 'my-server' already exists");
    }

    #[test]
    fn spawn_failed_display() {
        let err = Error::SpawnFailed("permission denied".to_string());
        assert_eq!(err.to_string(), "Failed to spawn server: permission denied");
    }

    #[test]
    fn send_failed_display() {
        let err = Error::SendFailed("channel closed".to_string());
        assert_eq!(err.to_string(), "Failed to send message: channel closed");
    }

    #[test]
    fn kill_failed_display() {
        let err = Error::KillFailed("process not found".to_string());
        assert_eq!(err.to_string(), "Failed to kill server: process not found");
    }

    #[test]
    fn binary_not_found_display() {
        let err = Error::BinaryNotFound("/path/to/bin".to_string());
        assert_eq!(err.to_string(), "Sidecar binary not found: /path/to/bin");
    }

    #[test]
    fn io_error_display() {
        let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let err = Error::Io(io_err);
        assert!(err.to_string().contains("file not found"));
    }

    #[test]
    fn error_serializes_to_string() {
        let err = Error::ServerNotFound("test".to_string());
        let json = serde_json::to_string(&err).unwrap();
        // Error serializes as a string, not an object
        assert_eq!(json, "\"Server 'test' not found\"");
    }

    #[test]
    fn spawn_failed_serializes() {
        let err = Error::SpawnFailed("oops".to_string());
        let json = serde_json::to_string(&err).unwrap();
        assert_eq!(json, "\"Failed to spawn server: oops\"");
    }
}
