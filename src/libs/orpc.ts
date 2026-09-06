import { createClient } from 'tauri-plugin-tauribun'
import type { Router } from '../../src-bun/src/main'

// ✅ 正确：传入 Router 作为泛型参数
// ⚠️ 必须显式传 binaryPath！createClient 的默认值是 `binaries/${serverName}` = binaries/server，
//    但你的 exe 真实文件名是 stock（bun build --outfile stock / tauri.conf externalBin: binaries/stock），
//    不传会导致插件找不到 exe，请求永远静默挂起。

export const client = createClient<Router>('server', { binaryPath: 'binaries/stock' })
