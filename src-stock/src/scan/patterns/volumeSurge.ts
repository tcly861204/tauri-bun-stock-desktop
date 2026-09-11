import type { AnalysisData, KlineItem } from '@/utils/const.ts'
import { sma, calcMacd } from '@/analysis/indicators.ts'
const shortPeriod = 5
const longPeriod = 40
const minRatio = 1.5
export const TREND_NEAR_HIGH_RATIO = 0.9
export const MIN_TREND_SCORE = 3
export function calcTrendScore(klines: KlineItem[]): number {
  const closes = klines.map((k) => k.close)
  const ma20Arr = sma(closes, 20)
  const ma60Arr = sma(closes, 60)
  const { bar: macdBars } = calcMacd(closes)

  const lastClose = closes[closes.length - 1]!
  const lastMa20 = ma20Arr[ma20Arr.length - 1]!
  const lastMa60 = ma60Arr[ma60Arr.length - 1]!
  const lastMacdBar = macdBars[macdBars.length - 1]!

  let score = 0
  if (lastMa20 !== null && lastClose > lastMa20) score += 1
  if (lastMa60 !== null && lastClose > lastMa60) score += 1
  if (lastMa20 !== null && lastMa60 !== null && lastMa20 > lastMa60) score += 1
  if (lastMacdBar > 0) score += 1
  const recentHigh = Math.max(...closes.slice(-60))
  if (lastClose >= recentHigh * TREND_NEAR_HIGH_RATIO) score += 1
  return score
}
export function volumeSurge(
  analysis: AnalysisData,
  turnoverRate: number,
  pe: number,
  priceChange: number
): boolean | null {
  const { klines } = analysis
  if (klines.length < longPeriod + 1) return null
  // 换手率必须在 1% 到 10% 之间
  if (turnoverRate < 1 || turnoverRate > 10) return null
  // PE 必须 > 0
  if (pe <= 0) return null
  // 涨跌幅必须在 -5% 到 7% 之间
  if (priceChange < -5 || priceChange > 7) return null

  const closes = klines.map((k) => k.close)
  const vols = klines.map((k) => k.vol)
  const lastBar = klines[klines.length - 1]

  const avgShort = vols.slice(-shortPeriod).reduce((a, b) => a + b, 0) / shortPeriod
  const avgLong = vols.slice(-longPeriod).reduce((a, b) => a + b, 0) / longPeriod

  if (avgLong <= 0) return null
  const ratio = avgShort / avgLong
  if (ratio < minRatio) return null

  const trendScore = calcTrendScore(klines)
  if (trendScore < MIN_TREND_SCORE) return null

  // // 20日均线必须向上 且在价格下方
  const ma20 = sma(closes, 20)
  const lastMa20 = ma20[ma20.length - 1]!
  const prevMa20 = ma20[ma20.length - 2]!
  const lastClose = closes[closes.length - 1]!
  if (lastMa20 === null || prevMa20 === null || lastMa20 <= prevMa20 || lastClose <= lastMa20)
    return null

  // MACD > 0 且当天比前一天大
  const { macd } = calcMacd(closes)
  const lastMacd = macd[macd.length - 1]!
  const prevMacd = macd[macd.length - 2]!
  if (lastMacd < prevMacd || lastMacd <= 0) return null
  return true
}
