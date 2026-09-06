use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PingRequest {
    pub value: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PingResponse {
    pub value: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpawnServerRequest {
    /// The name/identifier for this server instance
    pub name: String,
    /// The path to the sidecar binary (relative to the app's binary directory)
    pub binary_path: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpawnServerResponse {
    /// Whether the server was successfully spawned
    pub success: bool,
    /// The name of the spawned server
    pub name: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SendMessageRequest {
    /// The name of the server to send the message to
    pub name: String,
    /// The message to send (will be written to stdin)
    pub message: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SendMessageResponse {
    /// Whether the message was successfully sent
    pub success: bool,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KillServerRequest {
    /// The name of the server to kill
    pub name: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KillServerResponse {
    /// Whether the server was successfully killed
    pub success: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    // Test that SpawnServerRequest serializes with camelCase
    #[test]
    fn spawn_request_serializes_camel_case() {
        let req = SpawnServerRequest {
            name: "test".to_string(),
            binary_path: "path/to/bin".to_string(),
        };
        let json = serde_json::to_string(&req).unwrap();
        assert!(json.contains("binaryPath"));
        assert!(json.contains("\"name\""));
    }

    // Test deserialization from camelCase JSON
    #[test]
    fn spawn_request_deserializes_from_camel_case() {
        let json = r#"{"name":"test","binaryPath":"path/to/bin"}"#;
        let req: SpawnServerRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.name, "test");
        assert_eq!(req.binary_path, "path/to/bin");
    }

    // Test SpawnServerResponse
    #[test]
    fn spawn_response_roundtrip() {
        let resp = SpawnServerResponse {
            success: true,
            name: "my-server".to_string(),
        };
        let json = serde_json::to_string(&resp).unwrap();
        let parsed: SpawnServerResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.success, resp.success);
        assert_eq!(parsed.name, resp.name);
    }

    // Test SendMessageRequest/Response
    #[test]
    fn send_message_roundtrip() {
        let req = SendMessageRequest {
            name: "server".to_string(),
            message: "hello".to_string(),
        };
        let json = serde_json::to_string(&req).unwrap();
        let parsed: SendMessageRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.name, req.name);
        assert_eq!(parsed.message, req.message);

        let resp = SendMessageResponse { success: true };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"success\":true"));
    }

    // Test KillServerRequest/Response
    #[test]
    fn kill_server_roundtrip() {
        let req = KillServerRequest {
            name: "server".to_string(),
        };
        let json = serde_json::to_string(&req).unwrap();
        let parsed: KillServerRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.name, req.name);

        let resp = KillServerResponse { success: true };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"success\":true"));
    }

    // Test PingRequest/Response with optional value
    #[test]
    fn ping_with_value() {
        let req = PingRequest {
            value: Some("hello".to_string()),
        };
        let json = serde_json::to_string(&req).unwrap();
        assert!(json.contains("\"value\":\"hello\""));

        let resp = PingResponse {
            value: Some("pong".to_string()),
        };
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"value\":\"pong\""));
    }

    #[test]
    fn ping_without_value() {
        let req = PingRequest { value: None };
        let json = serde_json::to_string(&req).unwrap();
        assert!(json.contains("\"value\":null"));
    }
}
