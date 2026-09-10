import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { queryApi, queryStockRealtime } from '@/libs/api'
import StockItem from '@/components/stock-item'
import type { SidebarItem } from '@/components/stock-item'
import Loading from '@/components/loading'
import { round } from '@/libs/math'
import { mergeStockCodes } from '@/libs/utils'
export function ThemePanel({
  selectCode,
  themeCode,
  setSelectCode,
  extInfo = {},
}: {
  themeCode: string
  selectCode: string
  setSelectCode: (code: string) => void
  extInfo?: Record<string, any>
}) {
  const [sideList, setSideList] = useState<SidebarItem[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    setLoading(true)
    queryApi(
      `SELECT type, code, name, lowDay, profit, market_cap, is_hidden as hidden FROM sector_stocks WHERE is_etf = 0 AND (sector_code = '${themeCode}' OR sub_sector_name = '${themeCode}')`
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
        }, {}) as Record<string, SidebarItem>
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
  }, [themeCode])
  const listRef = useRef<HTMLDivElement>(null)
  const selectedIndex = sideList.findIndex((item) => `${item.type}-${item.code}` === selectCode)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (selectedIndex > 0) {
          setSelectCode(`${sideList[selectedIndex - 1].type}-${sideList[selectedIndex - 1].code}`)
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (selectedIndex < sideList.length - 1) {
          setSelectCode(`${sideList[selectedIndex + 1].type}-${sideList[selectedIndex + 1].code}`)
        }
      }
    },
    [selectedIndex, sideList, setSelectCode]
  )
  useEffect(() => {
    if (!listRef.current || !selectCode) return
    const el = listRef.current.querySelector(`[data-code="${selectCode}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectCode])
  useEffect(() => {
    listRef.current?.focus()
  }, [sideList.length])
  const avgChange = useMemo(() => {
    const ch = sideList.filter((s) => s.profit !== null).map((s) => s.profit!)
    const avg = ch.length ? ch.reduce((a, b) => a + b, 0) / ch.length : 0
    return avg
  }, [sideList])
  return (
    <section className='w-[280px] max-w-[280px] min-w-[280px] h-[calc(100vh-138px)] flex flex-col'>
      <section
        className={`flex-shrink-0 text-[13px] mb-2 h-[36px] leading-[36px] text-white rounded-md text-center ${extInfo?.avgChange > 0 ? 'bg-[#f00]' : 'bg-emerald-500 '}`}
      >
        <span className='mr-2'>{extInfo?.name}</span>
        {extInfo?.avgChange > 0 ? '+' : ''}
        {round(avgChange, 2)}%
      </section>
      <section
        ref={listRef}
        className='flex-1 h-[calc(100vh-178px)] overflow-auto overflow-x-hidden scrollbar space-y-2 outline-none'
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {loading && <Loading />}
        {!loading &&
          sideList.map((item, index) => (
            <StockItem
              key={item.code}
              item={item}
              active={`${item.type}-${item.code}` === selectCode}
              index={index}
              onClick={setSelectCode}
            />
          ))}
      </section>
    </section>
  )
}
