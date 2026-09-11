import { readFileSync } from 'node:fs'
import type { KlineItem, BollBand, AnalysisData } from '@/utils/const.ts'
import { round, add, subtract, multiply, divide } from '@/utils/math.ts'

// ─── 工具函数 ───

export function roundTo(v: number, digits: number): number {
  return round(v, digits)
}

export function lastOpt(values: (number | null)[]): number | null {
  const v = values[values.length - 1]
  return v ?? null
}

export function avgTail(values: number[], count: number): number {
  const start = Math.max(0, values.length - count)
  const slice = values.slice(start)
  if (slice.length === 0) return 0
  return slice.reduce((a, b) => a + b, 0) / slice.length
}

// ─── 技术指标 ───

/** 简单移动平均 */
export function sma(values: number[], period: number): (number | null)[] {
  if (values.length < period) return values.map(() => null)
  const result: (number | null)[] = new Array(period - 1).fill(null)
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0
    for (let j = i + 1 - period; j <= i; j++) sum += values[j]!
    result.push(round(divide(sum, period), 3))
  }
  return result
}

/** 指数移动平均 */
export function ema(values: number[], period: number): number[] {
  if (values.length === 0) return []
  const result: number[] = [values[0]!]
  const k = divide(2, period + 1)
  for (let i = 1; i < values.length; i++) {
    result.push(add(multiply(values[i]!, k), multiply(result[result.length - 1]!, subtract(1, k))))
  }
  return result
}

/** MACD */
export function calcMacd(values: number[]): {
  dif: number[]
  dea: number[]
  bar: number[]
  macd: number[]
} {
  const ema12 = ema(values, 12)
  const ema26 = ema(values, 26)
  const dif = ema12.map((a, i) => subtract(a, ema26[i]!))
  const dea = ema(dif, 9)
  const bar = dif.map((d, i) => multiply(2, subtract(d, dea[i]!)))
  const macd = bar.map((v) => round(v))
  return { dif, dea, bar, macd }
}

/** 布林带 */
export function calcBoll(values: number[], period: number, k: number): (BollBand | null)[] {
  if (values.length < period) return values.map(() => null)
  const result: (BollBand | null)[] = new Array(period - 1).fill(null)
  for (let i = period - 1; i < values.length; i++) {
    const window = values.slice(i + 1 - period, i + 1)
    const mid = window.reduce((a, b) => a + b, 0) / period
    const variance = window.reduce((a, b) => a + (b - mid) ** 2, 0) / period
    const sd = Math.sqrt(variance)
    result.push({
      mid: roundTo(mid, 2),
      up: roundTo(mid + k * sd, 2),
      dn: roundTo(mid - k * sd, 2),
    })
  }
  return result
}

/** RSI (Wilder 平滑) */
export function calcRsi(values: number[], period: number): (number | null)[] {
  if (values.length <= period) return values.map(() => null)
  const result: (number | null)[] = new Array(period).fill(null)

  let avgGain = 0
  let avgLoss = 0
  for (let i = 1; i <= period; i++) {
    const change = values[i]! - values[i - 1]!
    if (change > 0) avgGain += change
    else avgLoss += Math.abs(change)
  }
  avgGain /= period
  avgLoss /= period
  result.push(avgLoss === 0 ? 100 : roundTo(100 - 100 / (1 + avgGain / avgLoss), 2))

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i]! - values[i - 1]!
    avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period
    avgLoss = (avgLoss * (period - 1) + (change < 0 ? Math.abs(change) : 0)) / period
    result.push(avgLoss === 0 ? 100 : roundTo(100 - 100 / (1 + avgGain / avgLoss), 2))
  }
  return result
}

/** OBV */
export function calcObv(klines: KlineItem[]): number[] {
  if (klines.length === 0) return []
  const result: number[] = [0]
  for (let i = 1; i < klines.length; i++) {
    const prev = result[result.length - 1]!
    if (klines[i]!.close > klines[i - 1]!.close) result.push(add(prev, klines[i]!.vol))
    else if (klines[i]!.close < klines[i - 1]!.close) result.push(subtract(prev, klines[i]!.vol))
    else result.push(prev)
  }
  return result
}

/** KDJ */
export function calcKdj(
  values: number[],
  n: number,
  k: number,
  d: number
): { k: number[]; d: number[]; j: number[] } {
  const len = values.length
  if (len < n)
    return { k: new Array(len).fill(50), d: new Array(len).fill(50), j: new Array(len).fill(50) }

  const rsv: number[] = new Array(len).fill(50)
  for (let i = n - 1; i < len; i++) {
    const window = values.slice(i + 1 - n, i + 1)
    const minVal = Math.min(...window)
    const maxVal = Math.max(...window)
    if (maxVal - minVal > 1e-10) rsv[i] = ((values[i]! - minVal) / (maxVal - minVal)) * 100
  }

  const kFactor = 2 / (k + 1)
  const dFactor = 2 / (d + 1)
  const k_vals: number[] = new Array(len).fill(50)
  const d_vals: number[] = new Array(len).fill(50)

  for (let i = n - 1; i < len; i++) {
    k_vals[i] = (1 - kFactor) * k_vals[i - 1]! + kFactor * rsv[i]!
    d_vals[i] = (1 - dFactor) * d_vals[i - 1]! + dFactor * k_vals[i]!
  }

  const j_vals = k_vals.map((kv, i) => 3 * kv - 2 * d_vals[i]!)
  return { k: k_vals, d: d_vals, j: j_vals }
}

/** CCI */
export function calcCci(
  high: number[],
  low: number[],
  close: number[],
  period: number
): (number | null)[] {
  const len = close.length
  if (len < period) return new Array(len).fill(null)

  const tp = high.map((h, i) => (h + low[i]! + close[i]!) / 3)
  const tp_sma = sma(tp, period)
  const result: (number | null)[] = new Array(period - 1).fill(null)

  for (let i = period - 1; i < len; i++) {
    const tpVal = tp[i]!
    const smaVal = tp_sma[i]!
    const md =
      tp.slice(i + 1 - period, i + 1).reduce((a, b) => a + Math.abs(b - smaVal), 0) / period
    result.push(md > 1e-10 ? roundTo((tpVal - smaVal) / (0.015 * md), 2) : 0)
  }
  return result
}

// ─── K 线解析 ───
export function parseStockInfoFromJson(jsonStr: string): {
  name: string
  price: number
  priceChange: number
  turnoverRate: number
  pe: number
} {
  const root = JSON.parse(jsonStr)
  const dataObj = root?.data
  if (!dataObj) throw new Error('未找到 data 字段')
  const symbolKey = Object.keys(dataObj)[0]
  if (!symbolKey) throw new Error('data 对象为空')
  const symbolData = dataObj[symbolKey]
  const info = symbolData.qt[symbolKey]
  return {
    name: info[1],
    price: Number(info[3]), // 最新价
    priceChange: Number(info[32]), // 涨跌幅
    turnoverRate: Number(info[38]), // 换手率（最新快照值，非历史值）
    pe: Number(info[39]),
  }
}

export function parseKlineFromJson(jsonStr: string, isFilter: boolean = false): KlineItem[] {
  const root = JSON.parse(jsonStr)
  const dataObj = root?.data
  if (!dataObj) throw new Error('未找到 data 字段')

  const symbolKey = Object.keys(dataObj)[0]
  if (!symbolKey) throw new Error('data 对象为空')

  const symbolData = dataObj[symbolKey]
  const series = symbolData?.qfqday ?? symbolData?.day
  if (isFilter && parseInt(symbolData.qt[symbolKey][6]) === 0) {
    throw new Error('股票已经停牌')
  }
  if (!series || !Array.isArray(series)) throw new Error('未找到 qfqday/day K线数据')

  const klines: KlineItem[] = []
  for (const row of series) {
    if (!Array.isArray(row) || row.length < 6) continue
    klines.push({
      date: String(row[0] ?? ''),
      open: parseFloat(row[1]) || 0,
      close: parseFloat(row[2]) || 0,
      high: parseFloat(row[3]) || 0,
      low: parseFloat(row[4]) || 0,
      vol: parseFloat(row[5]) || 0,
    })
  }
  if (klines.length === 0) throw new Error('K线数据为空')
  return klines
}

/** 从 K 线构建完整的分析数据 */
export function analyzeKlines(klines: KlineItem[], code = '', name = ''): AnalysisData {
  const close = klines.map((k) => k.close)
  const high = klines.map((k) => k.high)
  const low = klines.map((k) => k.low)
  const vol = klines.map((k) => k.vol)

  const { dif, dea, bar, macd } = calcMacd(close)
  const { k: k_vals, d: d_vals, j: j_vals } = calcKdj(close, 9, 3, 3)

  return {
    code,
    name,
    close,
    high,
    low,
    vol,
    ma5: sma(close, 5),
    ma10: sma(close, 10),
    ma20: sma(close, 20),
    ma60: sma(close, 60),
    bb: calcBoll(close, 20, 2),
    macd_dif: dif,
    macd_dea: dea,
    macd_bar: bar,
    macd_macd: macd,
    rsi: calcRsi(close, 14),
    obv: calcObv(klines),
    k: k_vals,
    d: d_vals,
    j: j_vals,
    cci: calcCci(high, low, close, 14),
    klines,
  }
}

/** 个股综合评分（同 Rust 版 analyze_local::calc_score） */
export function calcScore(a: AnalysisData): number {
  let score = 0

  // MA 系统 (30 分)
  const ma5 = lastOpt(a.ma5)
  const ma20 = lastOpt(a.ma20)
  const ma60 = lastOpt(a.ma60)
  if (ma5 !== null && ma20 !== null) {
    if (ma5 > ma20) {
      score = add(score, ma60 !== null && ma20 > ma60 ? 30 : 15)
    } else if (ma60 !== null) {
      score = add(score, ma20 < ma60 ? -20 : -10)
    } else {
      score = subtract(score, 10)
    }
  }

  // 布林带 (20 分)
  const bb = a.bb[a.bb.length - 1]
  if (bb) {
    const lastClose = a.close[a.close.length - 1]!
    if (lastClose > bb.up) score = add(score, 15)
    else if (lastClose > bb.mid) score = add(score, 10)
    else if (lastClose > bb.dn) score = subtract(score, 5)
    else score = subtract(score, 15)
  }

  // MACD (25 分)
  if (a.macd_dif.length >= 2 && a.macd_dea.length >= 2 && a.macd_bar.length >= 2) {
    const lastDif = a.macd_dif[a.macd_dif.length - 1]!
    const lastDea = a.macd_dea[a.macd_dea.length - 1]!
    const lastBar = a.macd_bar[a.macd_bar.length - 1]!
    const prevBar = a.macd_bar[a.macd_bar.length - 2]!
    if (lastDif > lastDea) {
      score = add(score, lastBar > prevBar ? 25 : 15)
    } else {
      score = add(score, lastBar > prevBar ? -5 : -20)
    }
  }

  // RSI (15 分)
  const rsi = lastOpt(a.rsi)
  if (rsi !== null) {
    if (rsi > 50) {
      score = add(score, rsi > 80 ? 5 : 15)
    } else if (rsi < 20) {
      score = add(score, 5)
    } else {
      score = subtract(score, 10)
    }
  }

  // OBV (10 分)
  if (a.obv.length > 5) {
    const last = a.obv[a.obv.length - 1]!
    const prev = a.obv[a.obv.length - 5]!
    score = add(score, last > prev ? 10 : -10)
  }

  return Math.max(-100, Math.min(100, score))
}

/** 读取并分析单个股票文件 */
export function loadAndAnalyze(
  filePath: string,
  name: string,
  rebackNum = 0
): { code: string; analysis: AnalysisData; klines: KlineItem[]; turnoverRate: number; pe: number } {
  const code = filePath.split(/[\\/]/).pop()?.replace('.json', '') ?? ''
  const jsonStr = readFileSync(filePath, 'utf-8')
  const klines = parseKlineFromJson(jsonStr)
  if (klines.length < 30)
    throw new Error(`K线数据不足（仅 ${klines.length} 条），需要至少 30 条数据`)
  const analysis = analyzeKlines(
    rebackNum > 0 ? klines.slice(0, 0 - rebackNum) : klines,
    code,
    name
  )

  const root = JSON.parse(jsonStr)
  const dataObj = root?.data
  if (!dataObj) throw new Error('未找到 data 字段')
  const symbolKey = Object.keys(dataObj)[0]
  if (!symbolKey) throw new Error('data 对象为空')
  const symbolData = dataObj[symbolKey]
  const info = symbolData.qt[symbolKey]
  return {
    code,
    analysis,
    klines: rebackNum > 0 ? klines.slice(0, 0 - rebackNum) : klines,
    turnoverRate: Number(info[38]), // 换手率（最新快照值，非历史值）
    pe: Number(info[39]),
  }
}
