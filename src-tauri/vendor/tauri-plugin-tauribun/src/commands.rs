use tauri::{command, AppHandle, Runtime};

use crate::models::*;
use crate::Result;
use crate::TauribunExt;

#[command]
pub(crate) async fn ping<R: Runtime>(
    app: AppHandle<R>,
    payload: PingRequest,
) -> Result<PingResponse> {
    app.tauribun().ping(payload)
}

#[command]
pub(crate) async fn spawn_server<R: Runtime>(
    app: AppHandle<R>,
    payload: SpawnServerRequest,
) -> Result<SpawnServerResponse> {
    app.tauribun().spawn_server(payload).await
}

#[command]
pub(crate) async fn send_message<R: Runtime>(
    app: AppHandle<R>,
    payload: SendMessageRequest,
) -> Result<SendMessageResponse> {
    app.tauribun().send_message(payload).await
}

#[command]
pub(crate) async fn kill_server<R: Runtime>(
    app: AppHandle<R>,
    payload: KillServerRequest,
) -> Result<KillServerResponse> {
    app.tauribun().kill_server(payload).await
}
