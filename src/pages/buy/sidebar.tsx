import { FC, useEffect, useState } from 'react'
import Skeleton from '@/components/skeleton'
import StockItem from '@/components/stock-item'
import type { SidebarItem } from '@/components/stock-item'
import { queryApi, queryStockRealtime } from '@/libs/api'
import { mergeStockCodes } from '@/libs/utils'

type Props = {
  panel: string
  tab: string
  selectCode: string
  setSelectCode: (code: string) => void
}

const Sidebar: FC<Props> = ({ panel, tab, selectCode, setSelectCode }) => {
  const [sideList, setSideList] = useState<SidebarItem[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!tab) return
    setLoading(true)
    queryApi<SidebarItem>(
      `SELECT b.*, s.type, s.sub_sector_name as subSectorName, s."lowDay" FROM ${panel} as b LEFT JOIN sector_stocks as s ON b.code = s.code WHERE b."date" = '${tab}' AND s.is_hidden = 0 AND s.is_etf = 0`
    )
      .then(async (res) => {
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
        setSideList(
          Object.values(stocks)
            .filter((item) => item.isYLine || item.isLongShadow)
            .filter(
              (item) =>
                !(
                  item.name.includes('退') ||
                  item.name.includes('停') ||
                  item.name.includes('st') ||
                  item.name.includes('ST')
                )
            )
            .filter((item) => item.market_cap > 0 && item.market_cap < 120)
            .sort((a, b) => b.profit - a.profit)
        )
      })
      .finally(() => setLoading(false))
  }, [tab, panel])
  return (
    <section className='w-[240px] h-[calc(100vh-226px)] relative flex flex-col pr-1'>
      <section className='flex-1 flex flex-col gap-2 overflow-auto overflow-x-hidden scrollbar outline-none'>
        {loading ? (
          <Skeleton />
        ) : (
          sideList.map((item, index) => (
            <StockItem
              key={item.code}
              item={item}
              index={index + 1}
              active={`${item.type}-${item.code}` === selectCode}
              onClick={setSelectCode}
            />
          ))
        )}
      </section>
    </section>
  )
}
export default Sidebar
