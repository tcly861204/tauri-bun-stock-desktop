import dayjs from 'dayjs'
import { add, divide, subtract } from './math'

export const formatDate = (fmt: string = 'YYYY-MM-DD HH:mm:ss', date?: dayjs.ConfigType) => {
  return dayjs(date).format(fmt)
}

export const toNum = (str: string | number) => {
  const arr = `${str}`.split('.')
  if (arr.length > 1) {
    arr[1] = arr[1].length === 1 && Number(arr[1]) < 10 ? `${arr[1]}0` : arr[1]
    return arr.join('.')
  }
  return `${str}.00`
}

export const isWorking = () => {
  return [1, 2, 3, 4, 5].includes(dayjs().day())
}
export const isTrending = () => {
  const time = Number(formatDate('HHmm'))
  return time >= 915 && time <= 1500
}

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

/** 将日K线聚合为周K线 [date, open, close, high, low, volume] */
export function dayToWeekKline(
  dayKline: [string, string, string, string, string, string][]
): [string, string, string, string, string, string][] {
  const weeks = new Map<string, [string, string, string, string, string, string]>()
  for (const [date, open, close, high, low, volume] of dayKline) {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // 回到本周一
    const mon = new Date(d.getFullYear(), d.getMonth(), diff)
    const key = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`
    const prev = weeks.get(key)
    if (prev) {
      prev[2] = close // 收盘 = 最后一天
      prev[3] = String(Math.max(Number(prev[3]), Number(high))) // 最高
      prev[4] = String(Math.min(Number(prev[4]), Number(low))) // 最低
      prev[5] = String(add(Number(prev[5]), Number(volume))) // 成交量求和
    } else {
      weeks.set(key, [key, open, close, high, low, volume])
    }
  }
  return Array.from(weeks.values())
}

export const mergeStockCodes = (list: { type: number; code: string }[]): string[] => {
  return list.map((item) => `${item.type === 1 ? 'sh' : item.type === 0 ? 'sz' : 'bj'}${item.code}`)
}
