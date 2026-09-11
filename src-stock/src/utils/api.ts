/** API 调用封装 */
import { sleep } from 'bun'

/** 重试配置 */
interface RetryOptions {
  /** 最大重试次数（不含首次请求），默认 3 */
  retries?: number
  /** 首次退避基数 ms，默认 600 */
  baseDelayMs?: number
  /** 单次最大退避 ms，默认 8000 */
  maxDelayMs?: number
}

/** 通用失败重试 — 指数退避 + 随机抖动，避免限流时重试风暴
 *  网络错误 / HTTP 非 2xx / 函数内部抛错 都会触发重试
 */
async function retryOnFailure<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries = 3, baseDelayMs = 600, maxDelayMs = 8000 } = options
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt >= retries) break
      // 退避: 600 → 1200 → 2400 → ...,封顶 maxDelayMs,并叠加随机抖动打散重试时刻
      const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt)
      const jitter = Math.floor(Math.random() * backoff)
      await sleep(backoff + jitter)
    }
  }
  throw lastError
}

/** 批量获取腾讯实时行情 API — GBK → UTF-8 解码 */
export async function getBatchRealtimeQuotes(codes: string[]): Promise<string[]> {
  const url = `http://qt.gtimg.cn/q=${codes.join(',')}`
  const resp = await fetch(url)
  const buf = await resp.arrayBuffer()
  // @ts-ignore
  return new TextDecoder('gbk').decode(buf).split('\n').filter(Boolean)
}

/** 腾讯股票历史 K 线 API — 下载前复权日线
 *  带自动重试：网络错误、HTTP 非 2xx、返回非 JSON（如限流页面）都会指数退避重试
 */
export async function downloadKlineFromTencent(
  marketPrefix: string,
  code: string,
  day: number = 420
): Promise<string> {
  const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${marketPrefix}${code},day,,,${day},qfq`
  return retryOnFailure(async () => {
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const text = await resp.text()
    // 腾讯限流时可能返回非 JSON 页面,提前抛出以触发重试
    if (!text.trimStart().startsWith('{')) throw new Error('接口返回非 JSON(疑似被限流)')
    return text
  })
}
/** 东方财富涨停池 API — 获取历史涨停股 */
export async function getHistoryTopicRise(date: string): Promise<any | null> {
  const timestamp = Date.now()
  const url = `https://push2ex.eastmoney.com/getTopicZTPool?cb=callbackdata6906823&ut=7eea3edcaed734bea9cbfc24409ed989&dpt=wz.ztzt&Pageindex=0&pagesize=200&sort=fbt%3Aasc&date=${date}&_=${timestamp}`
  const resp = await fetch(url, {
    headers: {
      'Referer': 'https://push2ex.eastmoney.com',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    },
  })

  const text = await resp.text()
  const match = text.match(/callbackdata\d+\((.+)\)/)
  if (!match) throw new Error('解析东方财富回调数据失败')

  const json = JSON.parse(match[1]!)
  return json?.data ?? null
}
