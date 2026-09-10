import { useState, useCallback } from 'react'
import type { SidebarItem } from '@/components/stock-item'
import { queryApi, queryStockRealtime } from '@/libs/api'
import { mergeStockCodes } from '@/libs/utils'

export function useSidebar() {
  const [keyword, setkeyword] = useState('')
  const [sideList, setSideList] = useState<SidebarItem[]>([])
  const [loading, setLoading] = useState(false)
  // 公共：根据 SQL 拉取数据并填充实时行情
  const fetchStocks = useCallback(
    async (sql: string) => {
      setLoading(true)
      try {
        const res = await queryApi<SidebarItem>(sql)
        const codes = mergeStockCodes(res as { type: number; code: string }[])
        const stocks: Record<string, SidebarItem> = res.reduce((prev: any, cur: any) => {
          prev[cur.code] = {
            ...cur,
            price: 0,
            profit: 0,
            isYLine: false,
            isLongShadow: false,
            market_cap: 0,
          }
          return prev
        }, {})

        await queryStockRealtime(codes, (info) => {
          stocks[info.code].profit = info.profit
          stocks[info.code].market_cap = info.market_cap
          stocks[info.code].price = info.price
          stocks[info.code].isYLine = info.isYLine
          stocks[info.code].isLongShadow = info.isLongShadow
        })
        return stocks
      } finally {
        setLoading(false)
      }
    },
    [setLoading]
  )
  return {
    keyword,
    setkeyword,
    sideList,
    fetchStocks,
    setSideList,
    loading,
    setLoading,
  }
}
