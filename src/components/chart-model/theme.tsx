import { useEffect, useRef, useCallback, useMemo } from 'react'
import StockItem from '@/components/stock-item'
import Skeleton from '@/components/skeleton'
import { round } from '@/libs/math'
import { isValidStock } from '@/libs/utils'
import { useSidebar } from '@/hooks/useSidebar'
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
  const { sideList, setSideList, loading, fetchStocks } = useSidebar()
  useEffect(() => {
    fetchStocks(
      `SELECT type, code, name, lowDay, profit, market_cap, is_hidden as hidden FROM sector_stocks WHERE is_etf = 0 AND is_hidden = 0 AND (sector_code = '${themeCode}' OR sub_sector_name = '${themeCode}')`
    ).then((stocks) => {
      setSideList(
        Object.values(stocks!)
          .filter(isValidStock)
          .sort((a, b) => b.profit - a.profit)
      )
    })
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
    <section className='w-[240px] max-w-[240px] min-w-[240px] h-[806px] flex flex-col'>
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
        {loading ? (
          <Skeleton />
        ) : (
          sideList.map((item, index) => (
            <StockItem
              key={item.code}
              item={item}
              active={`${item.type}-${item.code}` === selectCode}
              index={index}
              onClick={setSelectCode}
            />
          ))
        )}
      </section>
    </section>
  )
}
