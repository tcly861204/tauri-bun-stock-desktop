import { ProgressBar } from './format'
import { sleep } from 'bun'
/** 获取交易日的日期列表 */
export async function getRecentDays(days: number = 15): Promise<string[]> {
  return new Promise(async (resolve) => {
    const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=sh000001,day,,,${days},qfq`
    const resp = await fetch(url)
    const text = await resp.text()
    // 美化 JSON
    const parsed = JSON.parse(text)
    resolve(parsed.data['sh000001'].day.map((item: any) => item[0]).reverse())
  })
}
/** 取 [min, max] 区间内的随机整数 */
export function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** ===== 请求节流参数 —— 模拟人浏览，防止下载过快被腾讯接口封 ===== */
const RATE_MIN_MS = 800 // 单只之间的最短间隔
const RATE_MAX_MS = 2000 // 单只之间的最长间隔（随机，形成不规律的“人肉”节奏）
const LONG_BREAK_EVERY = 30 // 每下载多少只做一次长休息
const LONG_BREAK_MIN_MS = 5000 // 长休息最短时长
const LONG_BREAK_MAX_MS = 10000 // 长休息最长时长

/** 按人类浏览的节奏等待：单只之间随机停顿，凑满一批后再多歇一会 */
export async function throttledWait(index: number, total: number, pb: ProgressBar): Promise<void> {
  if (index + 1 >= total) return // 最后一只无需等待
  if ((index + 1) % LONG_BREAK_EVERY === 0) {
    const ms = randomDelay(LONG_BREAK_MIN_MS, LONG_BREAK_MAX_MS)
    pb.println(`  ☕ 已下载 ${index + 1} 只，休息 ${(ms / 1000).toFixed(1)}s 降低频率...`)
    await sleep(ms)
  } else {
    await sleep(randomDelay(RATE_MIN_MS, RATE_MAX_MS))
  }
}

/** 格式化日期为 YYYY-MM-DD */
export function formatDate(date: string): string {
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
}

/** 格式化数字，保留 3 位小数 */
export function formatNum(num: string): string {
  const [int, frac] = num.split('.')
  return `${int}.${(frac ?? '000').padEnd(3, '0')}`
}
