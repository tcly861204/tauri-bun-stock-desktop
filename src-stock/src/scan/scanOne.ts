import { loadAndAnalyze } from '@/analysis/indicators.ts'
import { join } from 'node:path'
import { type ScanResult } from './type.ts'
import { maAlignedUpSmallGain } from './patterns/maAlignedUpSmallGain.ts'
export function scanOne(
  type: number,
  code: string,
  name: string,
  dataDir: string,
  rebackNum: number
): ScanResult | null {
  try {
    const filePath = join(dataDir, `${code}.json`)
    const { analysis, turnoverRate, pe } = loadAndAnalyze(filePath, name, rebackNum)
    const { klines } = analysis
    const barIdx = klines.length - 1
    const bar = klines[barIdx]!
    const pattern: string[] = []
    if (pe > 120) return null
    // 🌱 均线多头小阳线(MA5>MA10>MA20, 收阳, 涨幅≤1%)
    if (maAlignedUpSmallGain(analysis, turnoverRate, pe) === true) {
      pattern.push('up_small_gain')
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
