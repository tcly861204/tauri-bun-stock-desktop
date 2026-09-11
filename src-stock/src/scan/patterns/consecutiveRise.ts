import type { AnalysisData } from '@/utils/const.ts'
import { lastOpt } from '@/analysis/indicators'
import { ma5 } from '@/utils/ma'

/** 均线模式 */
export type MaMode = 'strict' | 'ma5Only' | 'ma10Only' | 'ma20Only' | 'none'
export interface ConsecutiveRiseOptions {
  /** 连涨天数范围 [min, max] */
  daysRange: [number, number]
  /** 每日最大涨幅（百分比） */
  maxDailyGain: number
  /** 最低评分阈值（0~100） */
  minScore: number
  /** 是否要求收阳（收盘>开盘），默认 true */
  requireYang?: boolean
  /** 是否要求 K 线实体依次变长，默认 false */
  requireExpandingBody?: boolean
  /** 是否要求 MA5/MA10/MA20 无交叉，仅 maMode="strict" 时生效，默认 true */
  requireNoMaCross?: boolean
  /**
   * 均线模式:
   *  - "strict" (默认): MA5>MA10>MA20 多头排列且区间内无交叉
   *  - "ma5Only": 只要求 MA5 在连涨区间内逐日上涨
   *  - "ma10Only": 只要求 MA10 在连涨区间内逐日上涨
   *  - "ma20Only": 只要求 MA20 在连涨区间内逐日上涨
   *  - "none": 不要求均线模式
   */
  maMode?: MaMode
  /** 乖离率上限（收盘相对 MA20 的 %），超过视为过度乖离、连涨后回落风险大，默认 12 */
  maxBias20?: number
  /**
   * 允许连涨区间中间有 maxPullbackDays 根小幅回调日（收盘为小幅负数）。
   * 默认：minDays >= 6 时为 1，否则 0。回调日豁免收阳/开盘递增/MACD柱/均线逐日检查。
   */
  maxPullbackDays?: number
  /** 小幅回调日的跌幅下限（默认 -0.5%，跌破视为真实回调而非小幅波动） */
  pullbackGainFloor?: number
  /**
   * 涨幅平滑度上限：区间内日涨幅的标准差超过该值即视为"过山车"走势，直接过滤。
   * 默认 maxDailyGain * 0.4（maxDailyGain=3 时约 1.2）。
   */
  maxGainStdDev?: number
}
/**
 * 在区间 [start, end] 内检查 MA5/MA10/MA20 三条均线是否有交叉
 * 若在区间内任意位置出现交叉（相对位置变化）则返回 false
 */
function noMaCross(a: AnalysisData, start: number, end: number): boolean {
  const v5s = a.ma5[start]
  const v10s = a.ma10[start]
  const v20s = a.ma20[start]
  if (v5s == null || v10s == null || v20s == null) return false

  const init5v10 = v5s - v10s
  const init5v20 = v5s - v20s
  const init10v20 = v10s - v20s

  for (let i = start + 1; i <= end; i++) {
    const v5 = a.ma5[i]
    const v10 = a.ma10[i]
    const v20 = a.ma20[i]
    if (v5 == null || v10 == null || v20 == null) return false
    if (v5 < v10 || v5 < v20 || v10 < v20) return false

    if (init5v10 > 0 && v5 <= v10) return false
    if (init5v10 < 0 && v5 >= v10) return false
    if (init5v10 === 0 && v5 !== v10) return false

    if (init5v20 > 0 && v5 <= v20) return false
    if (init5v20 < 0 && v5 >= v20) return false
    if (init5v20 === 0 && v5 !== v20) return false

    if (init10v20 > 0 && v10 <= v20) return false
    if (init10v20 < 0 && v10 >= v20) return false
    if (init10v20 === 0 && v10 !== v20) return false
  }
  return true
}

/**
 * 圆弧顶过滤：MA5 仍上涨但涨势逐级放缓（⌒ 形态）
 * 最近 4 个 MA5 净上涨但相邻段涨幅逐级递减 → 视为圆弧顶，返回 true
 */
function isArcTop(a: AnalysisData): boolean {
  const n = a.close.length
  const m0 = a.ma5[n - 4]
  const m1 = a.ma5[n - 3]
  const m2 = a.ma5[n - 2]
  const m3 = a.ma5[n - 1]
  if (m0 == null || m1 == null || m2 == null || m3 == null) return false
  const d1 = m1 - m0
  const d2 = m2 - m1
  const d3 = m3 - m2
  return d3 > 0 && d3 < d2 && d2 < d1
}

export function consecutiveRise(a: AnalysisData): boolean | null {
  const opts: ConsecutiveRiseOptions = {
    daysRange: [6, 6],
    maxDailyGain: 3,
    minScore: 30,
    maMode: 'none',
    requireExpandingBody: false,
    // 显式启用：允许中间 1 根小幅回调 + 涨幅平滑度过滤
    maxPullbackDays: 1,
    pullbackGainFloor: -0.5,
    maxGainStdDev: 8 * 0.2,
  }
  const close = a.close
  const n = close.length
  if (n < 10) return null // 数据太少，无法判断

  const [minDays, maxDays] = opts.daysRange
  // if (maxBackDays < minDays || maxBackDays > maxDays) return null // 连涨天数必须在 [minDays, maxDays] 区间

  // 小幅回调配置：minDays>=6 时允许区间中间有 1 根小阴线（跌幅 ≥ pullbackFloor）
  const pullbackFloor = opts.pullbackGainFloor ?? -0.5
  const maxPullback = opts.maxPullbackDays ?? (minDays >= 6 ? 1 : 0)
  // 宽松模式（仅对长连涨启用）：只以收盘价涨幅为准，忽略收阳/开盘递增/MACD柱/均线逐日等逐日检查
  const lenient = maxPullback >= 1
  // 涨幅平滑度上限：日涨幅标准差超过该值视为"过山车"走势
  const maxGainStd = opts.maxGainStdDev ?? opts.maxDailyGain * 0.4

  // ── 第一步：从最近一天往前统计最大连涨天数 ──
  // 只要当日收盘 > 前日收盘，就算一天；
  // minDays>=6 时允许中间有 1 根小幅回调日（最后一天不允许是回调日）
  let maxBackDays = 0
  let pullbackUsed = 0
  for (let i = n - 1; i >= 1; i--) {
    const g = ((close[i]! - close[i - 1]!) / close[i - 1]!) * 100
    if (g > 0) {
      maxBackDays++
    } else if (i < n - 1 && maxPullback > 0 && pullbackUsed < maxPullback && g >= pullbackFloor) {
      maxBackDays++
      pullbackUsed++
    } else {
      break
    }
  }

  // 读取可配置开关（默认值均为 true）
  const requireYang = opts.requireYang ?? true
  const maMode = opts.maMode ?? 'strict'

  // ── 第二步：从最大候选天数向下递减，找到第一个满足所有条件的 ──
  // 优先取天数更多的（越靠近今天越有意义）
  const candidateUpper = Math.min(maxBackDays, maxDays)
  for (let days = candidateUpper; days >= minDays; days--) {
    const start = n - days // 连涨起始位置
    let valid = true

    // ── 逐日检查当天是否满足条件 ──
    // 允许 maxPullback 根小幅回调日（区间中间、跌幅 ≥ pullbackFloor）；
    // 宽松模式（长连涨）只以收盘价涨幅为准，忽略收阳/开盘递增等逐日检查
    const pullbackIdx = new Set<number>()
    for (let i = start; i < n; i++) {
      const gainPct = ((close[i]! - close[i - 1]!) / close[i - 1]!) * 100
      // 条件2：单日涨幅不超过上限
      if (gainPct > opts.maxDailyGain) {
        valid = false
        break
      }
      // 条件3：小幅回调日（中间位置的负涨幅，跌幅必须很小）
      if (gainPct <= 0) {
        if (i === n - 1 || maxPullback <= 0 || gainPct < pullbackFloor) {
          valid = false
          break
        }
        pullbackIdx.add(i)
        continue
      }
      if (!lenient) {
        // 条件1：收阳线（收盘 > 开盘）
        if (requireYang && a.klines[i]!.close <= a.klines[i]!.open) {
          valid = false
          break
        }
        // 条件1.5：当天开盘价 > 前一天开盘价
        if (i > start && a.klines[i]!.open <= a.klines[i - 1]!.open) {
          valid = false
          break
        }
      }
    }
    if (!valid || pullbackIdx.size > maxPullback) continue

    // ── 平滑度过滤：区间内日涨幅标准差过大 = 过山车走势（大阳小阳交替），放弃 ──
    {
      let sum = 0
      const gains: number[] = []
      for (let i = start; i < n; i++) {
        const g = ((close[i]! - close[i - 1]!) / close[i - 1]!) * 100
        gains.push(g)
        sum += g
      }
      const mean = sum / gains.length
      let varSum = 0
      for (const g of gains) varSum += (g - mean) ** 2
      const stdDev = Math.sqrt(varSum / gains.length)
      if (stdDev > maxGainStd) continue
    }

    // ── 条件4：最后一根 K 线不能有长上影线 ──
    // 上影线长度 > 实体长度 → 说明上方抛压重，放弃（按分取整，避免浮点误差误杀等长情况）
    const lastK = a.klines[n - 1]!
    const lastBody = Math.abs(lastK.close - lastK.open)
    const lastUpperShadow = lastK.high - Math.max(lastK.close, lastK.open)
    if (Math.round(lastUpperShadow * 100) > Math.round(lastBody * 100)) continue

    // ── 条件4.5：乖离率上限（收盘相对 MA20 偏离过远 → 均值回归大跌风险，默认 12%） ──
    const biasMa20 = a.ma20[n - 1]
    if (biasMa20 != null) {
      const bias20 = ((close[n - 1]! - biasMa20) / biasMa20) * 100
      if (bias20 > (opts.maxBias20 ?? 12)) continue
    }

    // ── 条件5：K 线实体依次变长 ──
    // 实体 = |close - open|，收阳时就是 close - open；回调日不参与比较
    if (opts.requireExpandingBody) {
      let prevBody = 0
      for (let i = start; i < n; i++) {
        if (pullbackIdx.has(i)) continue
        const body = a.klines[i]!.close - a.klines[i]!.open
        if (body <= prevBody) {
          valid = false
          break
        }
        prevBody = body
      }
      if (!valid) continue
    }

    // ── 条件6：MACD 柱（macd_macd）在连涨区间内逐日上涨（宽松模式跳过） ──
    if (!lenient) {
      for (let i = start + 1; i < n; i++) {
        if ((a.macd_macd[i] ?? 0) <= (a.macd_macd[i - 1] ?? 0)) {
          valid = false
          break
        }
      }
      if (!valid) continue
    }

    // ── 均线模式检查 ──
    if (maMode === 'ma20Only') {
      // 仅要求 MA20 在连涨区间内逐日上涨（宽松模式跳过）
      if (!lenient) {
        for (let i = start + 1; i < n; i++) {
          if ((a.ma20[i] ?? 0) <= (a.ma20[i - 1] ?? 0)) {
            valid = false
            break
          }
        }
        if (!valid) continue
      }
    } else if (maMode === 'ma5Only') {
      // 仅要求 MA5 在连涨区间内逐日上涨（宽松模式跳过）
      if (!lenient) {
        for (let i = start + 1; i < n; i++) {
          if ((a.ma5[i] ?? 0) <= (a.ma5[i - 1] ?? 0)) {
            valid = false
            break
          }
        }
        if (!valid) continue
      }
    } else if (maMode === 'ma10Only') {
      // 仅要求 MA10 在连涨区间内逐日上涨（宽松模式跳过）
      if (!lenient) {
        for (let i = start + 1; i < n; i++) {
          if ((a.ma10[i] ?? 0) <= (a.ma10[i - 1] ?? 0)) {
            valid = false
            break
          }
        }
        if (!valid) continue
      }
    } else if (maMode === 'none') {
      // 不要求均线模式，跳过所有均线检查
    } else {
      // strict 模式：MA5>MA10>MA20 多头排列且区间内无交叉
      if (opts.requireNoMaCross ?? true) {
        if (!noMaCross(a, start, n - 1)) continue
      }
    }

    // ── 条件7：区间内 MA5 至少要有 2 次不低于其他均线 ──
    // 统计 MA5 >= MA10 或 MA5 >= MA20 的次数，少于 2 次则均线太弱
    {
      let aboveCount = 0
      for (let i = start; i < n; i++) {
        const m5 = a.ma5[i]
        const m10 = a.ma10[i]
        const m20 = a.ma20[i]
        if (m5 == null || m10 == null || m20 == null) continue
        if (m5 >= m10 || m5 >= m20) aboveCount++
      }
      if (aboveCount < 2) continue
    }

    // ── 条件8: ma5 均线必须有站上 10日线 或者 20日线 ──
    const lastMa5 = a.ma5[n - 1] as number
    const lastMa10 = a.ma10[n - 1] as number
    const lastMa20 = a.ma20[n - 1] as number
    if (lastMa5 <= lastMa10 || lastMa5 <= lastMa20) continue
    // ── 条件9：最后一根 K 线必须 挨着 ma5 ──
    if (lastK.low > lastMa5) continue

    // ── 圆弧顶过滤：MA5 仍上涨但涨势逐级放缓（⌒ 形态） ──
    if (isArcTop(a)) continue

    // ── 评分系统（满分 100） ──
    let score = 0
    const latestDif = lastOpt(a.macd_dif) ?? 0

    // 维度1：连涨天数评分（最高 50 分）
    if (days >= 5) score += 50
    else if (days >= 4) score += 40
    else score += 30

    // 计算每日涨幅的波动率（用于维度2）
    let sumGain = 0
    const gains: number[] = []
    for (let i = start; i < n; i++) {
      const g = ((close[i]! - close[i - 1]!) / close[i - 1]!) * 100
      sumGain += g
      gains.push(g)
    }
    const avgGain = sumGain / gains.length
    let varSum = 0
    for (const g of gains) varSum += (g - avgGain) ** 2
    const stdDev = Math.sqrt(varSum / gains.length)

    // 维度2：涨幅均匀度评分（最高 20 分）
    // 标准差越小越好，说明涨幅稳定温和，没有某一天突然爆拉
    if (stdDev < 0.3) score += 20
    else if (stdDev < 0.6) score += 10

    // 维度3：MACD 强度评分（最高 15 分）
    if (latestDif > 1) score += 15
    else if (latestDif > 0.5) score += 10
    else score += 5

    // 维度4：MA5 斜率评分（最高 15 分）
    // 斜率越大，上涨趋势越陡峭
    const ma5Start = ma5(a, start)
    const ma5End = ma5(a, n - 1)
    if (ma5Start > 1e-10) {
      const ma5Slope = (ma5End - ma5Start) / ma5Start
      if (ma5Slope > 0.03) score += 15
      else if (ma5Slope > 0.015) score += 10
      else score += 5
    }

    const finalScore = Math.max(0, Math.min(100, score))
    if (finalScore < opts.minScore) continue // 评分低于阈值，跳过

    // ── 生成结果 ──
    let totalGain = 0
    for (let i = start; i < n; i++) {
      totalGain += ((close[i]! - close[i - 1]!) / close[i - 1]!) * 100
    }
    return true
  }

  return null // 未找到符合条件的天数
}
