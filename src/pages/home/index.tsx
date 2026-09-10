import { useEffect, useState } from 'react'
import { queryApi } from '@/libs/api'
import { FundCard } from './fund-item'
import { client } from '@/libs/orpc'
import { round } from '@/libs/math'
import { DBFund, ExtFund, FundItem } from './types'

/** 解析腾讯行情接口返回的批量实时文本为 code → 行情 */
const parseRealtimeQuotes = (text: string): Map<string, ExtFund> => {
  const map = new Map<string, ExtFund>()
  text
    .split(';\n')
    .filter(Boolean)
    .forEach((line) => {
      const arr = line
        .replace(/^[^=]+="/, '')
        .replace(/"$/, '')
        .split('~')
      map.set(arr[0], {
        curPrice: arr[5],
        change: round(Number(arr[7]), 2),
        curDate: arr[8],
      })
    })
  return map
}
const stockCodeOf = (item: DBFund) => (item.etf_code ? `${item.type}-${item.etf_code}` : '')
const Home = () => {
  const [, setLoading] = useState(false)
  const [, setEditingItem] = useState<DBFund | null>(null)
  const [fundList, setFundList] = useState<FundItem[]>([])
  const [selectCode, setSelectCode] = useState('')
  useEffect(() => {
    setLoading(true)
    queryApi<DBFund>(
      'SELECT f.*, s.type FROM funds as f LEFT JOIN sector_stocks as s ON f.etf_code = s.code'
    )
      .then(async (res) => {
        if (!res?.length) {
          setFundList([])
          return
        }
        const text = await client.orpc.getStockRealtime({
          code: res.map((item) => `jj${item.code}`).join(','),
        })
        const realtimeQuotesMap = parseRealtimeQuotes(text)
        setFundList(
          res.map((item) => ({ ...item, ...realtimeQuotesMap.get(item.code) })) as FundItem[]
        )
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])
  const handleDelete = (item: DBFund) => {
    console.log(item)
  }
  return (
    <section className='pt-5 pl-5 w-full relative min-h-[400px]'>
      <section className='w-[300px] h-[calc(100vh-140px)] flex flex-col'>
        <section className='flex-1 flex flex-col gap-2 overflow-auto overflow-x-hidden scrollbar outline-none'>
          {fundList.map((item) => (
            <FundCard
              key={item.code}
              item={item}
              selected={selectCode === stockCodeOf(item)}
              onSelect={() => setSelectCode(stockCodeOf(item))}
              onEdit={() => setEditingItem(item)}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </section>
      </section>
    </section>
  )
}
export default Home
