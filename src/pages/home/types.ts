export interface DBFund {
  type: number
  code: string
  name: string
  byCostPrice: number
  byDate: string
  byNum: number
  etf_code: string
  etf_name: string
  etf_type: number
  theme_code: string
  theme_name: string
}

export interface ExtFund {
  curPrice: string
  change: number
  curDate: string
}

export type FundItem = DBFund & ExtFund
