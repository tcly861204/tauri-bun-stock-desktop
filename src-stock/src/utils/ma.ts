import type { AnalysisData, KlineItem } from './const.ts'
import { round, subtract, divide } from './math.ts'
// ─── Helpers ───

export function ma5(a: AnalysisData, i: number): number {
  return a.ma5[i] ?? 0
}
export function ma10(a: AnalysisData, i: number): number {
  return a.ma10[i] ?? 0
}
export function ma20(a: AnalysisData, i: number): number {
  return a.ma20[i] ?? 0
}
export function ma60(a: AnalysisData, i: number): number {
  return a.ma60[i] ?? 0
}

export function sliceMin(vals: number[], start: number, end: number): number {
  let m = Infinity
  for (let i = start; i < end; i++) {
    const v = vals[i]
    if (v !== undefined && v < m) m = v
  }
  return m
}
export function sliceMax(vals: number[], start: number, end: number): number {
  let m = -Infinity
  for (let i = start; i < end; i++) {
    const v = vals[i]
    if (v !== undefined && v > m) m = v
  }
  return m
}
/**
 * 查找数组中的局部最低点索引（滑动窗口内比所有邻居都低）
 * @param values 数值数组（允许 undefined/NaN）
 * @param lookRange 左右各看的范围
 * @returns 局部最低点的索引数组
 */
export const findLocalMinIndices = (
  values: (number | undefined)[],
  lookRange: number
): number[] => {
  const result: number[] = []
  for (let i = 0; i < values.length; i++) {
    const val = values[i]
    if (val === undefined || isNaN(val)) continue

    let isLowest = true
    const start = Math.max(0, i - lookRange)
    const end = Math.min(values.length - 1, i + lookRange)
    for (let j = start; j <= end; j++) {
      if (j === i) continue
      const other = values[j]
      if ((other !== undefined && !isNaN(other) && other < val) || (other === val && j > i)) {
        isLowest = false
        break
      }
    }
    if (isLowest) result.push(i)
  }
  return result
}

/**
 * 查找数组中的局部最高点索引（滑动窗口内比所有邻居都高）
 * @param values 数值数组（允许 undefined/NaN）
 * @param lookRange 左右各看的范围
 * @returns 局部最高点的索引数组
 */
export const findLocalMaxIndices = (
  values: (number | undefined)[],
  lookRange: number
): number[] => {
  const result: number[] = []
  for (let i = 0; i < values.length; i++) {
    const val = values[i]
    if (val === undefined || isNaN(val)) continue

    let isHighest = true
    const start = Math.max(0, i - lookRange)
    const end = Math.min(values.length - 1, i + lookRange)
    for (let j = start; j <= end; j++) {
      if (j === i) continue
      const other = values[j]
      if ((other !== undefined && !isNaN(other) && other > val) || (other === val && j > i)) {
        isHighest = false
        break
      }
    }
    if (isHighest) result.push(i)
  }
  return result
}

/**
 * 判断数组是不是一个正增长的数组
 * @param values 数值数组（允许 undefined/NaN）
 * @returns 是否是正增长的数组
 */
export function isIncreasing(values: number[]) {
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i]! >= values[i + 1]!) return false
  }
  return true
}

/**
 * 计算数组中所有元素的斜率中位数
 * @param values 数值数组（允许 undefined/NaN）
 * @returns 数组中所有元素的平均值
 */

export function calculateSenSlope(data: number[]): number {
  const n = data.length
  if (n < 2) return 0

  const slopes: number[] = []

  // 遍历所有可能的数据对 (i < j)
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      // 避免时间间隔为0的情况
      if (j !== i) {
        slopes.push((data[j]! - data[i]!) / (j - i))
      }
    }
  }

  // 对所有斜率进行排序并取中位数
  slopes.sort((a, b) => a - b)
  const mid = Math.floor(slopes.length / 2)

  return round(
    (slopes.length % 2 !== 0 ? slopes[mid]! : (slopes[mid - 1]! + slopes[mid]!) / 2) * 1000,
    2
  )
}

export function calculateAverageDiff(data: number[]): number {
  if (data.length < 2) return 0

  let sumDiff = 0
  for (let i = 1; i < data.length; i++) {
    sumDiff += data[i]! - data[i - 1]!
  }
  return round((sumDiff / (data.length - 1)) * 1000, 2)
}

export function calculateSlopeOLS(data: number[]): number {
  const n = data.length
  if (n < 2) return 0

  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0

  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += data[i]!
    sumXY += i * data[i]!
    sumX2 += i * i
  }

  // 斜率公式: (n * Σ(xy) - Σx * Σy) / (n * Σ(x^2) - (Σx)^2)
  const denominator = n * sumX2 - sumX * sumX
  if (denominator === 0) return 0

  return round(((n * sumXY - sumX * sumY) / denominator) * 1000, 2)
}

/* 计算每日涨幅 */
export function calculatePriceChange(data: number[]): number[] {
  if (data.length < 2) return []
  const priceChanges: number[] = []
  for (let i = 1; i < data.length; i++) {
    priceChanges.push(round(divide(subtract(data[i]!, data[i - 1]!), data[i - 1]!) * 100, 2))
  }
  return priceChanges
}

/* 计算某一段K线是否连续收阳线 */
export function isContinuousIncrease(data: KlineItem[]): boolean {
  if (data.length < 2) return false // 至少需要2条K线才能判断趋势
  // 检查是否所有K线都是阳线
  for (let i = 0; i < data.length; i++) {
    if (data[i]!.close <= data[i]!.open) {
      return false
    }
  }
  return true
}
/**
 * 判断K线是否超长下影线
 * @param open 开盘价
 * @param close 收盘价
 * @param high 最高价价
 * @param low 最低价价
 * @param longShadow 超长下影线的比例，默认4倍
 * @returns 是否超长下影线
 */
export const isLongShadow = (
  open: number,
  close: number,
  high: number,
  low: number,
  longShadow: number = 4
): boolean => {
  const upBody = Math.max(subtract(high, open), subtract(high, close))
  const body = Math.abs(subtract(open, close))
  const lowBody = Math.max(subtract(open, low), subtract(close, low))
  if (body === 0) return false
  if (upBody < lowBody && divide(lowBody, body) > longShadow) return true
  return false
}

/**
 * 超长上影线
 *
 */
export const isTopLongShadow = (
  open: number,
  close: number,
  high: number,
  low: number,
  longShadow: number = 4
): boolean => {
  const upBody = Math.max(subtract(high, open), subtract(high, close))
  const body = Math.abs(subtract(open, close))
  const lowBody = Math.max(subtract(open, low), subtract(close, low))
  if (body === 0 && upBody > 0) return true
  if (upBody > lowBody && upBody > body * longShadow) {
    return true
  }
  return false
}
