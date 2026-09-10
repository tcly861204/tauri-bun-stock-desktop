import { FC, useEffect, useCallback } from 'react'
import Skeleton from '@/components/skeleton'
import StockItem from '@/components/stock-item'
import { isValidStock } from '@/libs/utils'
import Search from '@/components/search'
import { useSidebar } from '@/hooks/useSidebar'
interface Props {
  tab: string
  selectCode: string
  setSelectCode: (code: string) => void
}
const Sidebar: FC<Props> = ({ tab, selectCode, setSelectCode }) => {
  const { keyword, setkeyword, sideList, setSideList, loading, fetchStocks } = useSidebar()
  useEffect(() => {
    if (!tab) return
    fetchStocks(
      `SELECT t.*, s."lowDay" FROM stock_tops as t LEFT JOIN sector_stocks as s ON t.code = s.code WHERE t."date" = '${tab}' AND s.is_hidden = 0`
    ).then((stocks) => {
      setSideList(
        Object.values(stocks!)
          .filter((item) => item.isYLine || item.isLongShadow)
          .filter(isValidStock)
          .filter((item) => item.market_cap > 0 && item.market_cap < 120)
          .sort((a, b) => b.profit - a.profit)
      )
    })
  }, [tab, fetchStocks])
  const onSearch = useCallback(() => {
    fetchStocks(
      keyword && keyword.length
        ? `SELECT * FROM sector_stocks WHERE is_etf = 0 AND is_hidden = 0 AND (name LIKE '%${keyword}%' OR code LIKE '%${keyword}%')`
        : `SELECT t.*, s."lowDay" FROM stock_tops as t LEFT JOIN sector_stocks as s ON t.code = s.code WHERE t."date" = '${tab}' AND s.is_hidden = 0`
    ).then((stocks) => {
      setSideList(Object.values(stocks!).filter(isValidStock))
    })
  }, [keyword, tab, fetchStocks])
  return (
    <section className='w-[240px] h-[calc(100vh-226px)] relative flex flex-col pr-1'>
      <Search keyword={keyword} setkeyword={setkeyword} onSearch={onSearch} />
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
