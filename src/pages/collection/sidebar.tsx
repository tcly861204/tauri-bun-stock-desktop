import { FC, useEffect, useCallback } from 'react'
import Skeleton from '@/components/skeleton'
import StockItem from '@/components/stock-item'
import { isValidStock } from '@/libs/utils'
import Search from '@/components/search'
import { useSidebar } from '@/hooks/useSidebar'

type Props = {
  panel: string
  selectCode: string
  setSelectCode: (code: string) => void
}

const Sidebar: FC<Props> = ({ panel, selectCode, setSelectCode }) => {
  const { keyword, setkeyword, sideList, setSideList, loading, fetchStocks } = useSidebar()
  useEffect(() => {
    fetchStocks(
      `SELECT type, code, name, lowDay, profit, market_cap, collection_date as date FROM sector_stocks WHERE is_etf = ${panel === 'etf' ? 1 : 0} AND is_collection = 1 AND is_hidden = 0 ORDER BY collection_date DESC`
    ).then((stocks) => {
      setSideList(Object.values(stocks!).filter(isValidStock))
    })
  }, [panel, fetchStocks])
  const onSearch = useCallback(() => {
    fetchStocks(
      keyword && keyword.length
        ? `SELECT * FROM sector_stocks WHERE is_etf = 0 AND is_hidden = 0 AND (name LIKE '%${keyword}%' OR code LIKE '%${keyword}%')`
        : `SELECT type, code, name, lowDay, profit, market_cap, collection_date as date FROM sector_stocks WHERE is_etf = ${panel === 'etf' ? 1 : 0} AND is_collection = 1 AND is_hidden = 0 ORDER BY collection_date DESC`
    ).then((stocks) => {
      setSideList(Object.values(stocks!).filter(isValidStock))
    })
  }, [keyword, panel, fetchStocks])
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
