export interface ScanResult {
  type: number // 市场类型（0=沪市, 1=深市）
  code: string // 股票代码
  name: string // 股票名称
  pattern: string // 模式
  lastDate: string // 最后交易日日期
}

// 枚举模式
export enum Pattern {
  MA5CrossMa10 = '1',
  MA5CrossMa10Ma20 = '2',
}
