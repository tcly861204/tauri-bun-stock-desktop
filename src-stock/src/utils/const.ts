/** K线数据点 */
export interface KlineItem {
  date: string // 日期，格式为 YYYY-MM-DD
  open: number // 开盘价
  close: number // 收盘价
  high: number // 最高价
  low: number // 最低价
  vol: number // 成交量
}

/** 布林带 */
export interface BollBand {
  mid: number
  up: number
  dn: number
}

/** 分析数据（含所有技术指标） */
export interface AnalysisData {
  code: string
  name: string
  close: number[]
  high: number[]
  low: number[]
  vol: number[]
  ma5: (number | null)[]
  ma10: (number | null)[]
  ma20: (number | null)[]
  ma60: (number | null)[]
  bb: (BollBand | null)[]
  macd_dif: number[]
  macd_dea: number[]
  macd_bar: number[]
  macd_macd: number[]
  rsi: (number | null)[]
  obv: number[]
  k: number[]
  d: number[]
  j: number[]
  cci: (number | null)[]
  klines: KlineItem[]
}

/** 统一形态扫描结果 */
export interface PatternScanResult {
  code: string
  name: string
  date?: string
  patternName: string
  score: number
  signal: string
  detail: string
}

/** 股票行（stock.json） */
export interface StockRow {
  type: number
  code: string
  name: string
}

/** 股票列表 */
export interface StockList {
  rows: StockRow[]
}

/** 大盘指数配置 */
export interface MarketIndex {
  code: string
  name: string
  rawCode: string
}

/** 大盘趋势评估 */
export interface MarketTrend {
  indexCode: string
  indexName: string
  trend: string
  score: number
  isBullish: boolean
  isBearish: boolean
  ma5Direction: string
  ma20Direction: string
  maRelation: string
  macdStatus: string
  volStatus: string
  currentPrice: number
  monthChangePct: number
  summary: string
}

/** 大盘综合环境 */
export interface MarketEnvironment {
  indices: MarketTrend[]
  compositeScore: number
  compositeTrend: string
  suggestedPosition: number
  advice: string
  bullishCount: number
  bearishCount: number
}

/** 个股分析报告 */
export interface StockReport {
  code: string
  name: string
  score: number
  signal: string
  content: string
}

/** .hev 文件条目 */
export interface HevEntry {
  code: string
  name: string
  suffix: string
}

/** 配置常量 */
export const CONFIG = {
  /** 数据库目录 */
  DATA_BASE_DIR: 'D:\\soft\\stock-app-local-data\\database',
  /** 数据库文件 */
  DATA_BASE_FILE: 'D:\\soft\\stock-app-local-data\\database\\stock.db',
  /** 本地数据目录 */
  DATA_DIR: 'D:\\soft\\stock-app-local-data\\stock',
  /** 本地etf数据目录 */
  DATA_ETF_DIR: 'D:\\soft\\stock-app-local-data\\etf',
  /** 分析报告输出目录 */
  ANALYSIS_DIR: 'D:\\soft\\stock-app-local-data\\stock-analysis',
  /** Worker 脚本目录（编译后 exe 从此加载 worker） */
  WORKER_DIR: 'E:\\works\\tauri-bun-stock-desktop\\worker',
  /** 桌面 stock 目录（用于 hev 文件） */
  get DESKTOP_STOCK_DIR(): string {
    const home = process.env.USERPROFILE || 'C:\\Users\\default'
    return `${home}\\Desktop\\stock`
  },
  /** 大盘指数列表 */
  MARKET_INDICES: [
    { code: 'sh000001', name: '上证指数', rawCode: '000001' },
    { code: 'sz399001', name: '深证成指', rawCode: '399001' },
    { code: 'sz399006', name: '创业板指', rawCode: '399006' },
    { code: 'sh000688', name: '科创50', rawCode: '000688' },
  ] as MarketIndex[],
}

export function getMarketPrefix(rawCode: string): string {
  if (
    rawCode.startsWith('000') ||
    rawCode.startsWith('600') ||
    rawCode.startsWith('601') ||
    rawCode.startsWith('603') ||
    rawCode.startsWith('605') ||
    rawCode.startsWith('688')
  ) {
    return 'sh'
  }
  return 'sz'
}
