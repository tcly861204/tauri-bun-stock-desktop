import type { AnalysisData } from '@/utils/const.ts'
import type { KlineItem } from '@/utils/const.ts'

/** 涨停阈值：创业板/科创板 20%，主板 10% */
function limitUpThreshold(code: string): number {
  if (code.startsWith('30') || code.startsWith('688')) return 0.195
  return 0.095
}

/** 近 n 个交易日是否出现过涨停 */
function hasLimitUpInLastN(code: string, klines: KlineItem[], n: number): boolean {
  const start = Math.max(1, klines.length - n)
  for (let j = klines.length - 1; j >= start; j--) {
    const prevClose = klines[j - 1]!.close
    if (prevClose > 0 && (klines[j]!.close - prevClose) / prevClose >= limitUpThreshold(code)) {
      return true
    }
  }
  return false
}

const minShadowBodyRatio = 3.0 // 下影线必须大于实体的 3 倍

export function longShadow(code: string, analysis: AnalysisData, pe: number): boolean | null {
  const { ma5, ma10, ma20, klines } = analysis
  if (pe <= 0) return null

  // 近 3 个交易日不得出现涨停
  if (hasLimitUpInLastN(code, klines, 3)) return null

  // 上影线可忽略阈值：上影线 ≤ 实体 × 0.1
  const maxUpperShadowRatio = 0.4
  // 下影线绝对长度下限：≥ 收盘价 × 2%，否则实体很小也会被"影/体>3"误判
  const minShadowPct = 2.0

  // ─── 仅检查最新一根 K 线 ───
  const barIdx = klines.length - 1
  const bar = klines[barIdx]!

  const v5 = ma5[barIdx]
  const v10 = ma10[barIdx]
  const v20 = ma20[barIdx]
  if (v5 == null || v10 == null || v20 == null) return null

  // 10/20 日均线必须都向上（当日值 > 前一日值）
  const prev10 = ma10[barIdx - 1]
  const prev20 = ma20[barIdx - 1]
  if (prev10 == null || prev20 == null) return null
  if (v10 <= prev10 || v20 <= prev20) return null

  // 5 日线或 10 日线必须穿过这根 K 线（MA 值落在最低—最高之间，不看实体）
  const maxMa = Math.max(v5, v10)
  const minMa = Math.min(v5, v10)
  if (bar.high < minMa || bar.low > maxMa) return null

  // 当天最高价不能是近4天最高价（过滤当日创近期新高的突破K线，保留低位洗盘K线）
  let maxHighRecent = 0
  for (let j = Math.max(0, barIdx - 3); j <= barIdx; j++) {
    maxHighRecent = Math.max(maxHighRecent, klines[j]!.high)
  }
  if (bar.high >= maxHighRecent) return null

  const body = Math.abs(bar.close - bar.open)
  const upperShadow = bar.high - Math.max(bar.open, bar.close)
  const lowerShadow = Math.min(bar.open, bar.close) - bar.low
  if (body <= 0 || lowerShadow <= 0) return null

  // 下影线必须大于实体 × minShadowBodyRatio
  if (lowerShadow / body <= minShadowBodyRatio) return null

  // 下影线必须有绝对长度，过滤掉实体极小导致"影/体"虚高的小影线
  if (lowerShadow < (bar.close * minShadowPct) / 100) return null

  // 上影线小到可以忽略
  if (upperShadow > body * maxUpperShadowRatio) return null
  return true
}
