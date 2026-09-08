import { createServer } from 'tauri-plugin-tauribun'
import { getStockkline, getStockRealtime } from './stock'
const router = {
  getStockkline,
  getStockRealtime,
}
// 启动服务器，'server' 是服务器标识符
createServer('server', router)
export type Router = typeof router
