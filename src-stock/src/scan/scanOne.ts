import { loadAndAnalyze } from '@/analysis/indicators.ts'
import { join } from 'node:path'
import { type ScanResult } from './type.ts'
import { maAlignedUpSmallGain } from './patterns/maAlignedUpSmallGain.ts'
import { lastLowBreakoutBuy } from './patterns/lastLowBreakoutBuy.ts'
import { longShadow } from './patterns/longShadow.ts'
import { ma5ReversalCross } from './patterns/ma5ReversalCross.ts'
import { consecutiveRise } from './patterns/consecutiveRise.ts'
import { volumeSurge } from './patterns/volumeSurge.ts'
export function scanOne(
  type: number,
  code: string,
  name: string,
  dataDir: string,
  rebackNum: number
): ScanResult | null {
  try {
    const filePath = join(dataDir, `${code}.json`)
    const { analysis, turnoverRate, pe, priceChange } = loadAndAnalyze(filePath, name, rebackNum)
    const { klines } = analysis
    const barIdx = klines.length - 1
    const bar = klines[barIdx]!
    const pattern: string[] = []
    if (pe > 120) return null
    // 🌱 均线多头小阳线(MA5>MA10>MA20, 收阳, 涨幅≤1%)
    if (maAlignedUpSmallGain(analysis, turnoverRate, pe) === true) {
      pattern.push('up_small_gain')
    }
    // 📈 MA5局部低点突破买入
    if (lastLowBreakoutBuy(analysis, pe) === true) {
      pattern.push('buy_signal')
    }
    // 📉 超长下影线扫描(60日线向上)
    if (longShadow(code, analysis, pe) === true) {
      pattern.push('long_shadow')
    }
    // 📈 MA5拐头上穿(近5日递减→递增+实体穿5日线)
    if (ma5ReversalCross(analysis) === true) {
      pattern.push('ma5_reversal_cross')
    }
    // 📈 连涨6日
    if (consecutiveRise(analysis) === true) {
      pattern.push('consecutive_rise')
    }
    // 📈 成交量激增(20日均线向上, 60日均线向上, 20日均线>60日均线, 20日均线>60日均线, 20日均线>60日均线, 20日均线>60日均线)
    if (volumeSurge(analysis, turnoverRate, pe, priceChange) === true) {
      pattern.push('volume_surge')
    }
    if (pattern.length === 0) return null
    return {
      type,
      code,
      name,
      pattern: pattern.join(','),
      lastDate: bar.date,
    }
  } catch (_) {
    return null
  }
}
