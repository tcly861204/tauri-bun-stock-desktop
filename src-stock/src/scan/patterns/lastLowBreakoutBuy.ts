import type { AnalysisData } from '@/utils/const.ts'
import { findLocalMinIndices } from '@/utils/ma.ts'

export function lastLowBreakoutBuy(analysis: AnalysisData, pe: number): boolean | null {
  const { klines } = analysis
  if (klines.length < 10) return null

  const { high, ma5, ma10, ma20 } = analysis
  // 过滤掉前期的 null 值，避免被 findLocalMinIndices 当成 0 处理
  const closeValues: (number | undefined)[] = klines.map((v) => (v === null ? undefined : v.close))
  const lowIndices = findLocalMinIndices(closeValues, 5)
  if (lowIndices.length === 0) return null

  const lastLowIdx = lowIndices[lowIndices.length - 1]!
  if (lastLowIdx < 3 || lastLowIdx + 2 >= klines.length) return null

  let priorHigh = -Infinity
  for (let j = lastLowIdx - 3; j < lastLowIdx; j++) {
    if (high[j]! > priorHigh) priorHigh = high[j]!
  }

  // 与前端保持一致：用 high 判断突破
  const lastIdx = klines.length - 1
  const lastBar = klines[lastIdx]!

  // PE 必须 > 0
  if (pe <= 0) return null

  // 条件1: 传统突破 — 突破日必须是最后一天 + 当天收阳上涨
  let conditionPass = false
  let breakoutIdx = -1
  for (let j = lastLowIdx + 2; j <= lastIdx; j++) {
    if (high[j]! > priorHigh) {
      breakoutIdx = j
      break
    }
  }
  if (breakoutIdx === lastIdx) {
    if (
      lastBar.close > lastBar.open &&
      !(lastIdx > 0 && lastBar.close <= klines[lastIdx - 1]!.close)
    ) {
      conditionPass = true
    }
  }

  // // 条件2: 低点往后三条全部收阳（或条件）
  if (!conditionPass && lastLowIdx === klines.length - 4) {
    let allBullish = true
    for (let j = klines.length - 3; j <= klines.length - 1; j++) {
      if (klines[j]!.close <= klines[j]!.open) {
        allBullish = false
        break
      }
    }
    conditionPass = allBullish
  }

  if (!conditionPass) return null

  // 条件3: 最后5日均线必须大于10日均线或者20日均线
  const lastMa5 = ma5[lastIdx]!
  const lastMa10 = ma10[lastIdx]!
  const lastMa20 = ma20[lastIdx]!
  if (lastMa5 < lastMa10 && lastMa5 < lastMa20) return null

  // 条件4: 突破日放量确认 — 最后一天成交量需高于前5日均量 1.5 倍（过滤无量假突破）
  // const avgVol = klines.slice(-6, -1).reduce((s, k) => s + k.vol, 0) / 5
  // if (lastBar.vol < avgVol * 1.5) return null

  // 条件5: 收盘价不追高 — 最后收盘价距突破位涨幅不超过 8%
  // if (lastBar.close > priorHigh * 1.08) return null

  // // 条件6: MA5 向上（最后两根递增）+ MACD 多头（DIF > DEA）
  // const ma5Last = analysis.ma5[lastIdx]
  // const ma5Prev = analysis.ma5[lastIdx - 1]
  // if (ma5Last == null || ma5Prev == null || ma5Last <= ma5Prev) return null
  // if (analysis.macd_dif[lastIdx]! <= analysis.macd_dea[lastIdx]!) return null

  // 条件7: 当天涨幅过滤 — 最后一天涨幅不超过 8%（避免追涨停/已大涨）
  const prevClose = klines[lastIdx - 1]!.close
  if (prevClose > 0 && (lastBar.close - prevClose) / prevClose > 0.08) return null
  return true
}
