import type { MarketEnvironment, MarketTrend } from '@/utils/const.ts'
import { CONFIG } from '@/utils/const.ts'
import { parseKlineFromJson, analyzeKlines, lastOpt, avgTail } from './indicators.ts'

/** 从线上 API 获取大盘指数数据并分析趋势 */
export async function analyzeMarketTrends(): Promise<MarketEnvironment> {
  const trends: MarketTrend[] = []
  let totalScore = 0

  for (const idx of CONFIG.MARKET_INDICES) {
    const prefix = idx.code.startsWith('sh') ? 'sh' : 'sz'
    const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${prefix}${idx.rawCode},day,,,360,qfq`

    try {
      const resp = await fetch(url)
      const text = await resp.text()
      const trend = analyzeSingleIndex(text, idx.code, idx.name)
      if (trend) {
        const weight = idx.code === 'sh000001' ? 4 : 3
        totalScore += trend.score * weight
        trends.push(trend)
      }
    } catch {
      // skip failed index
    }
  }

  if (trends.length === 0) {
    throw new Error('无法获取大盘指数数据，请检查网络连接')
  }

  const totalWeight = trends.reduce((sum, t) => sum + (t.indexCode === 'sh000001' ? 4 : 3), 0)
  const compositeScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0

  const bullishCount = trends.filter((t) => t.isBullish).length
  const bearishCount = trends.filter((t) => t.isBearish).length

  let compositeTrend: string, suggestedPosition: number, advice: string
  if (compositeScore >= 50) {
    compositeTrend = 'bullish'
    suggestedPosition = 0.8
    advice = '📈 **市场环境良好**，可积极参与，建议仓位 7~8 成。'
  } else if (compositeScore >= 20) {
    compositeTrend = 'bullish'
    suggestedPosition = 0.6
    advice = '📈 **市场偏暖**，可适度参与，建议仓位 5~6 成。'
  } else if (compositeScore >= -20) {
    compositeTrend = 'oscillating'
    suggestedPosition = 0.4
    advice = '📊 **市场震荡**，观望为主，轻仓操作，建议仓位 3~4 成。'
  } else if (compositeScore >= -50) {
    compositeTrend = 'bearish'
    suggestedPosition = 0.2
    advice = '📉 **市场偏弱**，注意风险，建议仓位 1~2 成或空仓观望。'
  } else {
    compositeTrend = 'bearish'
    suggestedPosition = 0.1
    advice = '🚨 **市场弱势**，建议空仓等待，仅极轻仓参与最强个股。'
  }

  return {
    indices: trends,
    compositeScore,
    compositeTrend,
    suggestedPosition,
    advice,
    bullishCount,
    bearishCount,
  }
}

function analyzeSingleIndex(jsonStr: string, code: string, name: string): MarketTrend | null {
  let klines
  try {
    klines = parseKlineFromJson(jsonStr)
  } catch {
    return null
  }
  if (klines.length < 30) return null

  const analysis = analyzeKlines(klines)
  const close = analysis.close
  const currentPrice = close[close.length - 1]!

  // --- 均线方向 ---
  const ma5Direction = getMaDirection(analysis.ma5, 3)
  const ma20Direction = getMaDirection(analysis.ma20, 5)

  // --- MA5 与 MA20 关系 ---
  const ma5 = lastOpt(analysis.ma5)
  const ma20 = lastOpt(analysis.ma20)
  let maRelation = '数据不足'
  if (ma5 !== null && ma20 !== null) {
    if (ma5 > ma20) {
      const prevGap =
        (analysis.ma5[analysis.ma5.length - 2] ?? 0) -
        (analysis.ma20[analysis.ma20.length - 2] ?? 0)
      const currGap = ma5 - ma20
      maRelation = currGap > prevGap ? '多头排列且发散 ↑' : '多头排列但收敛 →'
    } else if (ma5 < ma20) {
      const prevGap =
        (analysis.ma20[analysis.ma20.length - 2] ?? 0) -
        (analysis.ma5[analysis.ma5.length - 2] ?? 0)
      const currGap = ma20 - ma5
      maRelation = currGap > prevGap ? '空头排列且发散 ↓' : '空头排列但收敛 →'
    } else {
      maRelation = '均线粘合'
    }
  }

  // --- MACD ---
  let macdStatus = '数据不足'
  if (analysis.macd_dif.length >= 2) {
    const dif = analysis.macd_dif[analysis.macd_dif.length - 1]!
    const dea = analysis.macd_dea[analysis.macd_dea.length - 1]!
    const bar = analysis.macd_bar[analysis.macd_bar.length - 1]!
    const prevBar = analysis.macd_bar[analysis.macd_bar.length - 2]!

    if (dif > dea && dif > 0)
      macdStatus = bar > prevBar ? '水上金叉+红柱放大（强势）' : '水上金叉+红柱缩短（衰减）'
    else if (dif > dea)
      macdStatus = bar > prevBar ? '水下金叉+红柱放大（反弹）' : '水下金叉+红柱缩短（弱反弹）'
    else if (dif > 0)
      macdStatus = bar < prevBar ? '水上死叉+绿柱放大（回调）' : '水上死叉+绿柱缩短（企稳）'
    else
      macdStatus = bar < prevBar ? '水下死叉+绿柱放大（加速下跌）' : '水下死叉+绿柱缩短（下跌减速）'
  }

  // --- 量能 ---
  const vols = analysis.vol
  const v20 = avgTail(vols, 20)
  const v5 = avgTail(vols, 5)
  let volStatus = '数据不足'
  if (v20 > 0) {
    const ratio = v5 / v20
    if (ratio > 1.5) volStatus = '明显放量'
    else if (ratio > 1.2) volStatus = '温和放量'
    else if (ratio > 0.8) volStatus = '量能平稳'
    else volStatus = '明显缩量'
  }

  // --- 月涨幅 ---
  const monthChangePct =
    close.length >= 30
      ? ((currentPrice - close[close.length - 30]!) / close[close.length - 30]!) * 100
      : 0

  // --- 综合评分 ---
  let score = 0
  if (ma5 !== null && ma20 !== null) {
    if (ma5 > ma20) {
      score += 25
      if (ma5Direction === '上升' && ma20Direction === '上升') score += 15
    } else if (ma5 < ma20) {
      score -= 20
      if (ma5Direction === '下降' && ma20Direction === '下降') score -= 15
    }
  }

  const dif = analysis.macd_dif[analysis.macd_dif.length - 1]!
  const dea = analysis.macd_dea[analysis.macd_dea.length - 1]!
  if (dif > dea) {
    score += 20
    if (dif > 0) score += 10
  } else {
    score -= 15
    if (dif < 0) score -= 10
  }

  if (monthChangePct > 10) score += 20
  else if (monthChangePct > 5) score += 15
  else if (monthChangePct > 2) score += 10
  else if (monthChangePct > 0) score += 5
  else if (monthChangePct > -5) score -= 5
  else if (monthChangePct > -10) score -= 15
  else score -= 20

  if (volStatus === '温和放量') score += 10
  else if (volStatus === '明显放量') score += 5
  else if (volStatus === '明显缩量') score -= 5

  score = Math.max(-100, Math.min(100, score))

  const trend = score >= 30 ? 'bullish' : score <= -30 ? 'bearish' : 'oscillating'
  const isBullish = trend === 'bullish'
  const isBearish = trend === 'bearish'

  const trendCn =
    trend === 'bullish' ? '📈 上升趋势' : trend === 'bearish' ? '📉 下降趋势' : '📊 震荡整理'
  const summary = `${trendCn} | 点位:${currentPrice.toFixed(2)} | 近30日:${monthChangePct.toFixed(2)}% | MA5:${ma5Direction} MA20:${ma20Direction} | ${maRelation} | ${macdStatus} | 评分:${score}`

  return {
    indexCode: code,
    indexName: name,
    trend,
    score,
    isBullish,
    isBearish,
    ma5Direction,
    ma20Direction,
    maRelation,
    macdStatus,
    volStatus,
    currentPrice,
    monthChangePct: Math.round(monthChangePct * 100) / 100,
    summary,
  }
}

function getMaDirection(ma: (number | null)[], n: number): string {
  const values = ma.filter((v): v is number => v !== null)
  if (values.length < n + 1) return '数据不足'
  const recent = values.slice(values.length - n - 1)
  if (recent.length < 2) return '数据不足'
  const first = recent[0]!
  const last = recent[recent.length - 1]!
  const diff = (last - first) / first
  if (diff > 0.01) return '上升'
  if (diff < -0.01) return '下降'
  return '走平'
}

/** 生成大盘环境 Markdown 报告 */
export function generateMarketSection(env: MarketEnvironment): string {
  const trendCn =
    env.compositeTrend === 'bullish'
      ? '📈 **看多**'
      : env.compositeTrend === 'bearish'
        ? '📉 **看空**'
        : '📊 **震荡**'
  let md = `> 综合判断：${trendCn}　综合评分：**${env.compositeScore}**　建议仓位：**${(env.suggestedPosition * 100).toFixed(0)}%**\n\n`
  md += `**操作建议**：${env.advice}\n\n`
  md += '### 各大指数分析\n\n'
  md += '| 指数 | 点位 | 近30日 | 趋势判断 | MA5方向 | MA20方向 | 均线关系 | MACD状态 |\n'
  md += '|------|------|--------|----------|---------|----------|----------|----------|\n'

  for (const idx of env.indices) {
    const icon = idx.trend === 'bullish' ? '📈' : idx.trend === 'bearish' ? '📉' : '📊'
    md += `| ${idx.indexName} | ${idx.currentPrice.toFixed(2)} | ${idx.monthChangePct.toFixed(2)}% | ${icon} ${idx.score} | ${idx.ma5Direction} | ${idx.ma20Direction} | ${idx.maRelation} | ${idx.macdStatus} |\n`
  }

  md += '\n### 大盘评分与信号\n\n'
  md += `- 📊 **综合评分**：${env.compositeScore}（范围 -100 ~ 100）\n`
  md += `- 📈 **看多指数**：${env.bullishCount}/${env.indices.length} 个\n`
  md += `- 📉 **看空指数**：${env.bearishCount}/${env.indices.length} 个\n`
  md += `- 🎯 **建议仓位**：**${(env.suggestedPosition * 100).toFixed(0)}%**\n`

  if (env.compositeScore >= 20) md += '- ✅ **大盘环境适合交易**\n'
  else if (env.compositeScore >= -20) md += '- ⚠️ **大盘环境一般**\n'
  else md += '- 🚨 **大盘环境较差**\n'

  return md
}

/** 打印大盘指数分析结果 */
export function printMarketTrends(env: MarketEnvironment): void {
  for (const idx of env.indices) {
    const icon = idx.trend === 'bullish' ? '📈' : idx.trend === 'bearish' ? '📉' : '📊'
    console.log(`  ✅ ${idx.indexName} (${idx.indexCode}) ${icon} — 评分:${idx.score}`)
  }
}
