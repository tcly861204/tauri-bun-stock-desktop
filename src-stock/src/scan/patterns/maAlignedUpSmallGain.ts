import type { AnalysisData } from '@/utils/const.ts'
/** 乖离率阈值：最新收盘价相对 MA20 的最大偏离百分比，超过视为涨势过高（短期易回调） */
const MAX_BIAS20 = 15

export function maAlignedUpSmallGain(
  analysis: AnalysisData,
  turnoverRate: number,
  pe: number
): boolean | null {
  const { ma5, ma10, ma20, klines } = analysis
  // ─── 基础过滤 ───
  if (turnoverRate < 1 || turnoverRate > 10) return null
  if (pe <= 0) return null
  const values = analysis.vol

  const lastIdx = klines.length - 1
  const lastBar = klines[lastIdx]!

  const vMa5 = ma5[lastIdx]
  const vMa10 = ma10[lastIdx]
  const vMa20 = ma20[lastIdx]

  if (vMa5 == null || vMa10 == null || vMa20 == null) return null

  // ─── 条件 1: MA5 > MA10 > MA20（多头排列） ───
  if (!(vMa5 > vMa10 && vMa10 > vMa20)) return null

  // ─── 条件 2: MA20 从最后一天往前连续 6 天正增长 ───
  for (let i = 1; i <= 6; i++) {
    const cur = ma20[lastIdx - i + 1]
    const prev = ma20[lastIdx - i]
    if (prev == null || cur == null || cur <= prev) return null
  }

  // ─── 条件 3: 乖离率过滤（收盘价离 MA20 过远，短期易回调） ───
  const bias20 = ((lastBar.close - vMa20) / vMa20) * 100
  if (bias20 > MAX_BIAS20) return null

  // ─── 条件 4: 收盘价 > 开盘价（阳线） ───
  if (lastBar.close <= lastBar.open) return null

  // ─── 条件 5: 当日涨幅在 2% 以内（从 K 线计算，不依赖外部 quote） ───
  if (klines.length < 2) return null
  const prevBar = klines[lastIdx - 1]!
  const gainFromKline = ((lastBar.close - prevBar.close) / prevBar.close) * 100
  if (gainFromKline <= 0 || gainFromKline > 2) return null

  // ─── 条件 6: 当日K线重心必须站在ma5以上 ───
  if (lastBar.close + lastBar.open <= vMa5 * 2) return null

  // ─── 条件 7: MACD必须是正增长且最近3天大于0 ───
  const macd = analysis.macd_macd
  if (macd.length < 3) return null
  const lastMacd = macd[macd.length - 1]!
  const prevMacd1 = macd[macd.length - 2]!
  const prevMacd2 = macd[macd.length - 3]!
  if (!(lastMacd > 0 && prevMacd1 > 0 && prevMacd2 > 0)) return null
  if (!(lastMacd > prevMacd1 && prevMacd1 > prevMacd2)) return null

  // 过滤近3天成交量一天比一天萎缩
  if (values.length < 3) return null
  const lastEnd = values[values.length - 1]!
  const prevEnd = values[values.length - 2]!
  const prevPrevEnd = values[values.length - 3]!
  if (lastEnd <= prevEnd && prevEnd <= prevPrevEnd) return null
  return true
}
