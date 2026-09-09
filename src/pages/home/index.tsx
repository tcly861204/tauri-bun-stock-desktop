import { useEffect, useState } from 'react'
import { queryApi } from '@/libs/api'
import { client } from '@/libs/orpc'
import { round } from '@/libs/math'

interface DBFund {
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

interface ExtFund {
  curPrice: string
  change: number
  curDate: string
}

type FundItem = DBFund & ExtFund

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

const Home = () => {
  const [loading, setLoading] = useState(false)
  const [fundList, setFundList] = useState<FundItem[]>([])
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
  return <section className='pt-5 pl-5 w-full relative min-h-[400px]'></section>
}
export default Home
