import type { AnalysisData } from '@/utils/const.ts'
// ── 扫描参数（可按需调整）──
const WINDOW = 100 // 观察窗口（根）
const TROUGH_LOOKBACK = 5 // 谷底必须出现在最近 N 根内（反转刚启动）
const MIN_DECLINE_BARS = 15 // 高点 → 谷底至少下跌 N 根
const MIN_DECLINE_PCT = 0.15 // 下跌幅度至少 X%
const MAX_UP_TICK_RATIO = 0.3 // 下跌段允许的"回抽"占比（≤20% 接近完美阴跌）
const MAX_DIST_LOW = 0.05 // 今日 MA5 距 100 根最低 ≤ X%（处于长期低位）
const MAX_PRICE_TROUGH = 0.06 // 当前价距谷底 MA5 ≤ X%（刚反转，没涨高）
const MIN_BARS = 100 // 至少需要这么多根 K 线

export function ma5ReversalCross(analysis: AnalysisData): boolean | null {
  const { ma5, klines } = analysis
  const lastIdx = klines.length - 1
  const bar = klines[lastIdx]!
  if (lastIdx < MIN_BARS - 1) return null

  const m5 = ma5[lastIdx]
  const m5_1 = ma5[lastIdx - 1]
  if (m5 == null || m5_1 == null) return null

  const ma5Win = ma5.slice(-WINDOW) as (number | undefined)[]
  const last = ma5Win.length - 1
  const m5Now = ma5Win[last]
  if (m5Now == null) return null

  // 0) 长期低位：今日 MA5 距近 WINDOW 根最低 ≤ MAX_DIST_LOW（超长下跌到低位）
  let winMin = Infinity
  for (let i = 0; i < ma5Win.length; i++) {
    const v = ma5Win[i]
    if (v != null && v < winMin) winMin = v
  }
  if (winMin <= 0) return null
  if ((m5Now - winMin) / winMin > MAX_DIST_LOW) return null

  // 1) 近期谷底：最近 TROUGH_LOOKBACK 根内 MA5 最低的位置
  let troughIdx = last
  for (let i = Math.max(0, last - TROUGH_LOOKBACK + 1); i <= last; i++) {
    const v = ma5Win[i]
    if (v == null) return null
    if (v < ma5Win[troughIdx]!) troughIdx = i
  }
  const troughVal = ma5Win[troughIdx]!
  // 反转刚启动：谷底不能是今天（今天还在创新低 → 未反转）
  if (troughIdx === last) return null
  if (m5Now <= troughVal) return null
  // 今日 MA5 仍在向上（刚拐头，没走远）
  if (m5Now <= m5_1) return null

  // 2) 超长下跌：谷底之前的高点 → 谷底，下跌根数 / 跌幅均足够
  let peakIdx = -1
  let peakVal = -Infinity
  for (let i = 0; i <= troughIdx; i++) {
    const v = ma5Win[i]
    if (v == null) continue
    if (v > peakVal) {
      peakVal = v
      peakIdx = i
    }
  }
  if (peakIdx < 0 || peakVal <= 0) return null
  const declineBars = troughIdx - peakIdx
  const declinePct = (peakVal - troughVal) / peakVal
  if (declineBars < MIN_DECLINE_BARS) return null
  if (declinePct < MIN_DECLINE_PCT) return null
  // 接近完美下跌：下跌段内 MA5"回抽"（上涨）占比 ≤ MAX_UP_TICK_RATIO
  let upTicks = 0
  for (let i = peakIdx + 1; i <= troughIdx; i++) {
    const prev = ma5Win[i - 1]
    const cur = ma5Win[i]
    if (prev != null && cur != null && cur > prev) upTicks++
  }
  if (upTicks > Math.max(2, Math.floor(declineBars * MAX_UP_TICK_RATIO))) return null

  // 3) 反转还没涨高：当前价距谷底 MA5 ≤ MAX_PRICE_TROUGH
  if ((bar.close - troughVal) / troughVal > MAX_PRICE_TROUGH) return null
  // 4) K 线确认：今日阳线且收盘站上 MA5
  if (bar.close <= m5) return null
  if (bar.close <= bar.open) return null
  return true
}
