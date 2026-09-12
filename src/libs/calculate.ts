import { add, subtract, multiply, divide, round } from './math'

// 腾讯接口 K线数据格式：[time, open, close, high, low, volume]
// 例：["2024-11-06", "1499.561", "1495.561", "1513.551", "1485.781", "37631.000"]
interface AverageType {
  time: string // 时间
  close: number // 当日收盘价
  ma5: number // 5日价格移动平均线
  ma10: number // 10日价格移动平均线
  ma20: number // 20日价格移动平均线
  ma30: number // 30日价格移动平均线
  ma60: number // 60日价格移动平均线
  volume: number // 当日成交量
  avgVol5: number // 5日成交量移动平均线
  avgVol10: number // 10日成交量移动平均线
  avgVol20: number // 20日成交量移动平均线
  avgVol60: number // 60日成交量移动平均线
}

/**
 * 计算简单移动平均线 (SMA)
 * @param values 数值数组
 * @param period 周期
 * @returns 每个位置的移动平均值，前 period-1 个为 0（便于前端使用）
 */
function calcSMA(values: number[], period: number): number[] {
  return values.map((_, index) => {
    if (index < period - 1) return 0
    let sum = 0
    for (let i = index - period + 1; i <= index; i++) {
      sum += values[i]
    }
    return sum / period
  })
}

/**
 * 计算5日、10日、20日、60日价格均线和对应的成交量均线
 * 腾讯接口数据格式：[time, open, close, high, low, volume]
 */
export const calculateMA = (
  klines: [string, string, string, string, string, string][]
): AverageType[] => {
  const result: AverageType[] = []

  if (!klines || klines.length === 0) return result

  // 解析 K 线数据
  const data = klines.map((item) => {
    const [time, openPrice, closePrice, highPrice, lowPrice, volume] = item
    return {
      time,
      open: Number(openPrice),
      high: Number(highPrice),
      low: Number(lowPrice),
      close: Number(closePrice),
      volume: Number(volume),
    }
  })

  // 提取收盘价和成交量数组
  const closePrices = data.map((d) => d.close)
  const volumes = data.map((d) => d.volume)

  // 计算各周期均线
  const ma5 = calcSMA(closePrices, 5)
  const ma10 = calcSMA(closePrices, 10)
  const ma20 = calcSMA(closePrices, 20)
  const ma30 = calcSMA(closePrices, 30)
  const ma60 = calcSMA(closePrices, 60)

  const avgVol5 = calcSMA(volumes, 5)
  const avgVol10 = calcSMA(volumes, 10)
  const avgVol20 = calcSMA(volumes, 20)
  const avgVol60 = calcSMA(volumes, 60)

  // 组装结果
  for (let i = 0; i < data.length; i++) {
    result.push({
      time: data[i].time,
      volume: data[i].volume,
      close: data[i].close,
      ma5: ma5[i],
      ma10: ma10[i],
      ma20: ma20[i],
      ma30: ma30[i],
      ma60: ma60[i],
      avgVol5: avgVol5[i],
      avgVol10: avgVol10[i],
      avgVol20: avgVol20[i],
      avgVol60: avgVol60[i],
    })
  }
  return result
}

type RSIType = {
  time: string // 时间
  rsi6: number | string // 6日RSI
  rsi12: number | string // 12日RSI
  rsi24: number | string // 24日RSI
  closePrice: number // 当日收盘价
}

export const calculateRSI = (klines: [string, string, string, string, string, string][]) => {
  const result: [
    RSIType['time'],
    RSIType['rsi6'],
    RSIType['rsi12'],
    RSIType['rsi24'],
    RSIType['closePrice'],
  ][] = []
  if (!klines || klines.length === 0) return result

  const closePrices = klines.map((item) => Number(item[2]))
  const changes: number[] = []
  for (let i = 1; i < closePrices.length; i++) {
    changes.push(subtract(closePrices[i], closePrices[i - 1]))
  }

  const calcRSIForPeriod = (period: number): (number | string)[] => {
    const rsiValues: (number | string)[] = []
    for (let i = 0; i < period; i++) {
      rsiValues.push('--')
    }

    let avgGain = 0
    let avgLoss = 0
    for (let i = 0; i < period; i++) {
      if (changes[i] > 0) {
        avgGain = add(avgGain, changes[i])
      } else {
        avgLoss = add(avgLoss, Math.abs(changes[i]))
      }
    }
    avgGain = divide(avgGain, period)
    avgLoss = divide(avgLoss, period)
    const firstRS = avgLoss === 0 ? 999 : divide(avgGain, avgLoss)
    rsiValues.push(round(100 - divide(100, add(1, firstRS))))

    for (let i = period; i < changes.length; i++) {
      const gain = changes[i] > 0 ? changes[i] : 0
      const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0
      avgGain = divide(add(multiply(avgGain, period - 1), gain), period)
      avgLoss = divide(add(multiply(avgLoss, period - 1), loss), period)
      const rs = avgLoss === 0 ? 999 : divide(avgGain, avgLoss)
      rsiValues.push(round(100 - divide(100, add(1, rs))))
    }

    return rsiValues
  }

  const rsi6 = calcRSIForPeriod(6)
  const rsi12 = calcRSIForPeriod(12)
  const rsi24 = calcRSIForPeriod(24)

  for (let i = 0; i < klines.length; i++) {
    result.push([klines[i][0], rsi6[i], rsi12[i], rsi24[i], closePrices[i]])
  }

  return result
}

type Point = {
  time: string
  value: number
}

/**
 * 计算股票cci值
 * @param klines [string, string, string, string, string, string][]
 * @param period number
 * @returns Point[]
 */
export const calculateCCI = (
  klines: [string, string, string, string, string, string][],
  period = 14
): Point[] => {
  const result: Point[] = []
  if (!klines || klines.length === 0) return result

  const data = klines.map((item) => ({
    time: item[0],
    high: Number(item[3]),
    low: Number(item[4]),
    close: Number(item[2]),
  }))

  // 计算典型价格 TP = (H + L + C) / 3
  const tpList = data.map((d) => divide(add(add(d.high, d.low), d.close), 3))

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ time: data[i].time, value: 0 })
      continue
    }

    // 计算 SMA(TP)
    let sma = 0
    for (let j = i - period + 1; j <= i; j++) {
      sma = add(sma, tpList[j])
    }
    sma = divide(sma, period)

    // 计算平均偏差
    let md = 0
    for (let j = i - period + 1; j <= i; j++) {
      md = add(md, Math.abs(subtract(tpList[j], sma)))
    }
    md = divide(md, period)

    if (md === 0) {
      result.push({ time: data[i].time, value: 0 })
      continue
    }

    const cci = divide(subtract(tpList[i], sma), multiply(0.015, md))
    result.push({ time: data[i].time, value: round(cci) })
  }

  return result
}

/**
 * 查找cci结果中的一段曲线中的最低点位
 * @param data Point[]
 * @returns Point[]
 */
export const findLowestPoints = (data: Point[]): Point[] => {
  const result: Point[] = []
  if (!data || data.length < 3) return result

  for (let i = 1; i < data.length - 1; i++) {
    if (data[i].value < data[i - 1].value && data[i].value < data[i + 1].value) {
      result.push(data[i])
    }
  }

  return result
}

/**
 * 计算股票macd值
 * @param klines [string, string, string, string, string, string][]
 * @param shortPeriod number 短周期
 * @param longPeriod number 长周期
 * @param signalPeriod number 信号周期
 * @returns {
              time: string
              macd_ax: number
              macd_bx: number
              macd_dif: number
              macd_dea: number
            }[]
 */

function calcEMA(values: number[], period: number): number[] {
  const k = divide(2, period + 1)
  const ema: number[] = [values[0]]

  for (let i = 1; i < values.length; i++) {
    ema.push(add(multiply(values[i], k), multiply(ema[i - 1], subtract(1, k))))
  }

  return ema
}

export const calculateMACD = (
  klines: [string, string, string, string, string, string][],
  shortPeriod = 12,
  longPeriod = 26,
  signalPeriod = 9
): {
  time: string
  macd_ax: number
  macd_bx: number
  macd_dif: number
  macd_dea: number
  macd: number
}[] => {
  const result: {
    time: string
    macd_ax: number
    macd_bx: number
    macd_dif: number
    macd_dea: number
    macd: number
  }[] = []
  if (!klines || klines.length === 0) return result

  const closePrices = klines.map((item) => Number(item[2]))

  const emaShort = calcEMA(closePrices, shortPeriod)
  const emaLong = calcEMA(closePrices, longPeriod)

  const dif: number[] = []
  for (let i = 0; i < closePrices.length; i++) {
    dif.push(subtract(emaShort[i], emaLong[i]))
  }

  const dea = calcEMA(dif, signalPeriod)

  for (let i = 0; i < klines.length; i++) {
    const macd = multiply(2, subtract(dif[i], dea[i]))
    result.push({
      time: klines[i][0],
      macd_ax: macd > 0 ? round(macd, 3) : 0,
      macd_bx: macd < 0 ? round(macd, 3) : 0,
      macd_dif: round(dif[i], 3),
      macd_dea: round(dea[i], 3),
      macd: round(macd, 3),
    })
  }

  return result
}
