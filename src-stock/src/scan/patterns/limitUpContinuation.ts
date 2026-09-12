import type { KlineItem } from '@/utils/const'
/** 判断涨停阈值：创业板/科创板 20%，主板 10%（ST 已被排除） */
function limitUpThreshold(code: string): number {
  if (code.startsWith('30') || code.startsWith('688')) return 0.195
  return 0.095
}
export function limitUpContinuation(code: string, klines: KlineItem[]): boolean | null {
  if (klines.length < 30) return null

  const last = klines[klines.length - 1]!
  const prev = klines[klines.length - 2]!
  if (prev.close <= 0) return null

  const threshold = limitUpThreshold(code)
  const pct = (last.close - prev.close) / prev.close
  if (pct < threshold) return null

  // 核心过滤：必须封死涨停（收盘=最高）。炸板收高的次日延续只有 ~39%，直接排除
  const sealed = last.close === last.high
  if (!sealed) return null

  const oneWord = last.open === last.close && last.close === last.high

  // 连板数（从当日往前数连续涨停天数，用同一阈值）
  let boards = 1
  for (let j = klines.length - 2; j >= 1; j--) {
    const p = klines[j - 1]!.close
    if (p > 0 && (klines[j]!.close - p) / p >= threshold) boards++
    else break
  }
  // 排除异常连板（新股上市/长期一字，难以参与）
  if (boards > 6) return null

  // 排序分：连板数为主，一字板/封板加成
  return true
}
