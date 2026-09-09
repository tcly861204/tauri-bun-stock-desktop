import { FC, useEffect, useState } from 'react'
import StockItem from '@/components/stock-item'
import type { SidebarItem } from '@/components/stock-item'
import { queryApi, queryStockRealtime } from '@/libs/api'
import { mergeStockCodes } from '@/libs/utils'

type Props = {
  panel: string
  selectCode: string
  setSelectCode: (code: string) => void
}

const Sidebar: FC<Props> = ({ panel, selectCode, setSelectCode }) => {
  const [sideList, setSideList] = useState<SidebarItem[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    setLoading(true)
    queryApi<SidebarItem>(
      `SELECT type, code, name, lowDay, profit, market_cap, collection_date as date FROM sector_stocks WHERE is_etf = ${panel === 'etf' ? 1 : 0} AND is_collection = 1 AND is_hidden = 0 ORDER BY collection_date DESC`
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
          Object.values(stocks).filter(
            (item) =>
              !(
                item.name.includes('退') ||
                item.name.includes('停') ||
                item.name.includes('st') ||
                item.name.includes('ST')
              )
          )
        )
      })
      .finally(() => setLoading(false))
  }, [panel])
  return (
    <section className='w-[240px] h-[calc(100vh-226px)] relative flex flex-col pr-1'>
      <section className='flex-1 flex flex-col gap-2 overflow-auto overflow-x-hidden scrollbar outline-none'>
        {sideList.map((item, index) => (
          <StockItem
            key={item.code}
            item={item}
            index={index + 1}
            active={`${item.type}-${item.code}` === selectCode}
            onClick={setSelectCode}
          />
        ))}
      </section>
    </section>
  )
}
export default Sidebar
