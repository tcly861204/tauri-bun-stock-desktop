import { useMemo } from 'react'
import { findLocalMinIndices } from '@/libs/utils'

/** K线数据项 */
export interface KLineItem {
  time: string
  open: number
  close: number
  high: number
  low: number
  volume: number
}

/** 均线数据项（MA5/MA10/MA20/MA60） */
export interface MAItem {
  close: number
  ma5?: number
  ma10?: number
  ma20?: number
  ma60?: number
}

/**
 * 买入信号检测 — "回踩不破、支撑反弹"
 *
 * 核心思路：不等 MA5 突破（那是追涨），而是等价格已在 MA5 上方、
 * 回踩触碰均线但收盘不破、次日放量反弹时入场。
 *
 * 触发条件（同时满足）：
 * 1. MA5 > MA10 — 短期趋势向上，只做顺势
 * 2. 乖离率 < 3% — 进场点接近均线成本区，止损近、盈亏比好
 * 3. 前一根 K 线（回踩）：
 *    - 收阴线（价格正在回调）
 *    - 最低价触及 MA5 附近（±1%），即回踩到支撑位
 *    - 收盘价仍在 MA5 上方 — 支撑未破，回踩有效
 * 4. 当前 K 线（反弹）：
 *    - 收阳线（多头反攻）
 *    - 收盘价 > 前一根收盘价 — 实际反弹而非下跌中继
 *    - 收盘价 > MA5 — 仍在均线上方运行
 * 5. 成交量 > 前一根 — 放量反弹，资金确认
 *
 * 标记策略：
 * - 仅标记连续触发段的首根 K 线，避免重复标记同一段趋势
 *
 * @param kLines  全量 K 线数据
 * @param average 对应的全量均线数据
 * @returns 买入信号所在的 K 线索引数组（绝对索引）
 */

/**
 * 短线高灵敏买入信号检测 — "均线贴身缠绕、蓄势反弹"
 *
 * 核心优化：
 * 1. 扩大回踩容错率：允许前两日的最低价刺穿 MA5（洗盘形态），只要收盘价守住。
 * 2. 优化时间窗口：不再死卡“前一天必须回踩”，前天回踩、昨天横盘、今天反弹同样可以触发。
 * 3. 缩紧乖离率（0%~2%）：短线杜绝追高，只在贴近 MA5 的极佳盈亏比区间出手。
 * 4. 平滑成交量：允许微幅缩量反弹（过滤主力惜售、无抛压拉升的漏报）。
 */
export function useShortTermBuySignals(kLines: KLineItem[], average: MAItem[]) {
  return useMemo(() => {
    const indices: number[] = []

    // 因为涉及 i-2 的前瞻性对比，循环至少需要从索引 2 开始
    if (!average || average.length < 3 || !kLines || kLines.length < 3) return indices

    for (let i = 2; i < Math.min(average.length, kLines.length); i++) {
      const avg = average[i]
      const k = kLines[i]
      const prevK = kLines[i - 1]
      const prevPrevK = kLines[i - 2]

      // 安全提取前两天的 MA5 数据（带可选链）
      const prevAvg5 = average[i - 1]?.ma5
      const prevPrevAvg5 = average[i - 2]?.ma5

      // 【TS 类型守卫】确保所有参与计算的均线数据均明确存在且大于 0
      if (
        !avg.ma5 ||
        avg.ma5 <= 0 ||
        !avg.ma10 ||
        !prevAvg5 ||
        prevAvg5 <= 0 ||
        !prevPrevAvg5 ||
        prevPrevAvg5 <= 0
      ) {
        continue
      }

      // 1. 趋势：短期均线多头排列（MA5 > MA10），顺超短线势
      if (avg.ma5 <= avg.ma10) continue

      // 2. 超短线乖离率控制：当前收盘价偏离 MA5 不能超过 +2%，且不能低于 MA5
      // 贴合均线买入，控制止损成本
      const bias = (k.close - avg.ma5) / avg.ma5
      if (bias < 0 || bias > 0.02) continue

      // 3. 当前 K 线形态：必须是进攻阳线，且收盘价创前一日新高
      const isCurrentPositive = k.close > k.open && k.close > prevK.close

      // 4. 支撑验证（前两日中任意一天有踩线并守住的行为即可）
      // 容许最低价达到均线上方 2% 乃至跌破均线（不设下限），但收盘必须守在均线之上
      const isPrevPullback = prevK.low <= prevAvg5 * 1.02 && prevK.close >= prevAvg5
      const isPrevPrevPullback =
        prevPrevK.low <= prevPrevAvg5 * 1.02 && prevPrevK.close >= prevPrevAvg5

      const hasTouchSupport = isPrevPullback || isPrevPrevPullback

      // 5. 量能平滑：当前反弹阳线的成交量不低于前一日的 90%（容忍微幅缩量惜售拉升）
      const volumeOk = k.volume > prevK.volume * 0.9

      // 组合条件触发
      if (isCurrentPositive && hasTouchSupport && volumeOk) {
        // 【防重复标记】如果上一根 K 线刚刚触发过，短线内不连续标记，避免高位缠绕时反复提示
        if (indices.length > 0 && indices[indices.length - 1] === i - 1) {
          continue
        }
        indices.push(i)
      }
    }

    return indices
  }, [average, kLines])
}

/**
 * 卖出信号检测 — "反弹受阻、放量回落"
 *
 * 核心思路：与买入对称。不等 MA5 跌破（那是追跌），而是等价格已在 MA5 下方、
 * 反弹触碰均线但站不上去、次日放量下杀时离场。
 *
 * 触发条件（同时满足）：
 * 1. MA5 < MA10 — 短期趋势向下，只做顺势
 * 2. 前一根 K 线（反弹受阻）：
 *    - 收阳线（多头试图反弹）
 *    - 最高价触及 MA5 附近（±1%），即反弹到压力位
 *    - 收盘价仍在 MA5 下方 — 压力有效，突破失败
 * 3. 当前 K 线（回落）：
 *    - 收阴线（空头回归）
 *    - 收盘价 < 前一根收盘价 — 实际下跌而非反弹中继
 *    - 收盘价 < MA5 — 仍在均线下方运行
 * 4. 成交量 > 前一根 — 放量下杀，资金出逃确认
 *
 * 标记策略：
 * - 仅标记连续触发段的首根 K 线，避免重复标记同一段趋势
 *
 * @param kLines  全量 K 线数据
 * @param average 对应的全量均线数据
 * @returns 卖出信号所在的 K 线索引数组（绝对索引）
 */
export function useSellSignalIndices(kLines: KLineItem[], average: MAItem[]) {
  return useMemo(() => {
    const indices: number[] = []
    if (!average || average.length < 2 || !kLines || kLines.length < 2) return indices

    let prevTriggered = false

    for (let i = 1; i < Math.min(average.length, kLines.length); i++) {
      const avg = average[i]
      const prevAvg = average[i - 1]
      const k = kLines[i]
      const prevK = kLines[i - 1]

      if (!avg.ma5 || avg.ma5 <= 0 || !avg.ma10 || !prevAvg.ma5) {
        prevTriggered = false
        continue
      }

      // 趋势：MA5 < MA10，只做顺势
      if (avg.ma5 >= avg.ma10) {
        prevTriggered = false
        continue
      }

      // 前一根：反弹受阻于 MA5
      const prevBounceFail =
        prevK.close > prevK.open && // 收阳（反弹尝试）
        prevK.high >= prevAvg.ma5 * 0.99 && // 最高价触及 MA5（±1%）
        prevK.close < prevAvg.ma5 // 收盘仍在 MA5 下方（压力有效）

      // 当前：放量回落
      const curDrop =
        k.close < k.open && // 收阴（空头回归）
        k.close < prevK.close && // 收盘低于前日（实际下跌）
        k.close < avg.ma5 // 仍在 MA5 下方

      // 放量下杀
      const volumeOk = k.volume > prevK.volume

      const triggered = prevBounceFail && curDrop && volumeOk

      if (triggered && !prevTriggered) {
        indices.push(i)
      }
      prevTriggered = triggered
    }

    return indices
  }, [average, kLines])
}

/**
 * 金叉确立趋势 + 缩量回踩买入（最推荐）
 *
 * 策略逻辑：
 * 1. 先检测金叉（MA5 上穿 MA10），确立上涨趋势
 * 2. 金叉后 12 根 K 线窗口内，寻找"缩量回踩"确认买点：
 *    - 趋势仍在：MA5 仍高于 MA10（金叉趋势未被破坏）
 *    - 回踩均线：最低价触及 MA5 附近（±1%），即价格回落到均线支撑位
 *    - 缩量确认：当日成交量 < 前 5 日均量的 80%，卖压衰竭信号
 *    - 收盘站稳：收盘价仍在 MA5 上方，回踩不破支撑
 * 3. 每个金叉只标记首次符合条件的回踩买点
 *
 * 为什么推荐：金叉过滤了逆势交易，缩量回踩提供了低风险入场点，
 * 回踩不破则确认支撑有效，相比单纯金叉买入胜率更高、止损更近。
 *
 * @param kLines  当前可见的 K 线数据（含 volume 字段）
 * @param average 对应的均线数据
 * @returns 缩量回踩买入点所在的 K 线索引数组
 */
export function useGoldenCrossPullbackBuy(kLines: KLineItem[], average: MAItem[]) {
  return useMemo(() => {
    const indices: number[] = []
    if (!average || average.length < 10 || !kLines || kLines.length < 10) return indices

    // 最近一次金叉（MA5 上穿 MA10）的位置
    let lastGoldenCrossIdx = -1
    // 当前金叉段是否已标记过买点，每个金叉只标记一次
    let marked = false

    for (let i = 5; i < Math.min(average.length, kLines.length); i++) {
      const avg = average[i]
      const prevAvg = average[i - 1]
      const k = kLines[i]

      // 均线数据不完整则跳过
      if (!avg.ma5 || !avg.ma10 || !prevAvg.ma5 || !prevAvg.ma10) continue

      // --- 检测金叉：MA5 上穿 MA10，趋势确立 ---
      if (prevAvg.ma5 <= prevAvg.ma10 && avg.ma5 > avg.ma10) {
        lastGoldenCrossIdx = i
        marked = false // 新金叉，重置标记
        continue
      }

      // --- 金叉后窗口内寻找缩量回踩 ---
      if (
        lastGoldenCrossIdx < 0 ||
        marked ||
        i <= lastGoldenCrossIdx ||
        i - lastGoldenCrossIdx > 12 // 金叉后超过 12 根 K 线则失效
      ) {
        continue
      }

      // 趋势仍在：MA5 仍高于 MA10，金叉未被破坏
      if (avg.ma5 <= avg.ma10) continue

      // 回踩均线：最低价触及 MA5 附近（±1%），即价格回落到支撑位
      const pullback = k.low <= avg.ma5 * 1.01

      // 缩量确认：当日成交量 < 前 5 日均量的 80%，卖压衰竭
      const prevVolumes = kLines.slice(Math.max(0, i - 5), i).map((item) => item.volume)
      const avgVolume = prevVolumes.reduce((sum, v) => sum + v, 0) / prevVolumes.length
      const shrinking = avgVolume > 0 && k.volume < avgVolume * 0.8

      // 收盘站稳：收盘价在 MA5 上方，回踩不破支撑
      const holdAbove = k.close > avg.ma5

      if (pullback && shrinking && holdAbove) {
        indices.push(i)
        marked = true // 本次金叉已标记，后续不再重复标记
      }
    }

    return indices
  }, [average, kLines])
}

/**
 * MA5局部低点突破买入信号
 *
 * 策略逻辑：
 * 1. 找到 MA5 局部最低点（左右各看5根K线）
 * 2. 取最后一个低点，往前3天找最高价作为突破基准
 * 3. 往后观察3天，若某天收盘价突破基准价 → 买入信号
 *
 * @param kLines  全量 K 线数据
 * @param average 对应的全量均线数据
 * @returns 突破买入信号所在的 K 线索引数组（绝对索引）
 */
export function useLastLowBreakoutBuy(kLines: KLineItem[], average: MAItem[]) {
  return useMemo(() => {
    const indices: number[] = []
    if (!average || average.length < 7 || !kLines || kLines.length < 7) return indices

    const closeValues = average.map((a) => a.close)
    const lowIndices = findLocalMinIndices(closeValues, 5)
    if (lowIndices.length === 0) return indices

    // 只观察最后一个低点
    const lastLowIdx = lowIndices[lowIndices.length - 1]
    if (lastLowIdx < 3 || lastLowIdx + 2 >= kLines.length) return indices

    // 低点往前3天的最高价
    let priorHigh = -Infinity
    for (let j = lastLowIdx - 3; j < lastLowIdx; j++) {
      if (kLines[j].high > priorHigh) priorHigh = kLines[j].high
    }

    // 往后至少3天后，收盘价突破 priorHigh 即触发（一直观察到最新数据）
    for (let j = lastLowIdx + 2; j < kLines.length; j++) {
      if (kLines[j].high > priorHigh) {
        indices.push(j)
        break
      }
    }
    return indices
  }, [average, kLines])
}
