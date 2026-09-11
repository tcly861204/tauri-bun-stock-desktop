import { useEffect, useState } from 'react'
import KlineChart from '../kline-chart/index'
import RSIChart from '../rsi-chart/index'
import CanvasCCIChart from '../cci-chart/index'
import KlineHeader from '../kline-header/index'
import { queryDayKline } from '@/libs/api'
import NoSet from './noSet'
import Loading from '../loading'
import { get } from 'lodash-es'
import { divide, round, subtract } from '@/libs/math'
import { dayToWeekKline } from '@/libs/utils'

const Stock = ({
  code,
  isETF = false,
  isLocal = false,
  buyDate,
}: {
  code: string
  isETF?: boolean
  isLocal?: boolean
  buyDate?: string
}) => {
  const [loading, setLoading] = useState(false)
  const [stockTime, setStockTime] = useState('')
  const [stockName, setStockName] = useState('')
  const [stockPrice, setStockPrice] = useState(0)
  const [stockRate, setStockRate] = useState(0)
  const [stockExt, setStockExt] = useState<{ turnoverRate: number; pe: number }>({
    turnoverRate: 0, // 换手率
    pe: 0, // 市盈
  })
  const [kline, setKline] = useState<[string, string, string, string, string, string][]>([])
  const [weekKline, setWeekKline] = useState<[string, string, string, string, string, string][]>([])
  const setStockData = (data: any, stockInfo: string) => {
    const info = get(data, `data.${stockInfo}.qt.${stockInfo}`, [])
    setStockName(info[1])
    setStockPrice(info[3])
    setStockExt({
      turnoverRate: Number(info[38]),
      pe: Number(info[39]),
    })
    const kLine = get(data, `data.${stockInfo}.qfqday`, get(data, `data.${stockInfo}.day`, []))
    setKline(kLine)
    setWeekKline(dayToWeekKline(kLine))
    if (kLine.length > 1) {
      setStockTime(kLine[kLine.length - 1][0])
      const lastPrice = Number(kLine[kLine.length - 1][2]) * 100
      const secondLastPrice = Number(kLine[kLine.length - 2][2]) * 100
      const rate = round(divide(subtract(lastPrice, secondLastPrice), secondLastPrice) * 100, 2)
      setStockRate(rate)
    }
  }
  useEffect(() => {
    if (code) {
      setLoading(true)
      const stock = JSON.parse(localStorage.getItem('stock') || '{}')
      let stockInfo = ''
      if (code.indexOf('-') !== -1) {
        const [_type, _code] = code.split('-')
        stockInfo = `${Number(_type) === 1 ? 'sh' : Number(_type) === 2 ? 'bj' : 'sz'}${_code}`
      } else if (code.indexOf('#') !== -1) {
        const [_type, _code] = code.split('#')
        stockInfo = `${_type}${_code}`
      } else {
        stockInfo = `${stock[code].type === 1 ? 'sh' : stock[code].type === 2 ? 'bj' : 'sz'}${code}`
      }
      if (isLocal) {
        fetch(`/api/stock/local/${stockInfo.slice(2)}`)
          .then((res) => {
            return res.json()
          })
          .then(({ data }) => {
            setStockData(data, stockInfo)
          })
          .finally(() => setLoading(false))
      } else {
        queryDayKline(stockInfo)
          .then((res) => {
            setStockData(res, stockInfo)
          })
          .finally(() => setLoading(false))
      }
    }
  }, [code])
  return (
    <section className='flex-1 flex h-full gap-2'>
      <section className='flex flex-col relative flex-1'>
        {!code && <NoSet />}
        {loading ? <Loading /> : null}
        <div key={code}>
          <KlineHeader
            stockTime={stockTime}
            code={code}
            stockExt={stockExt}
            stockName={stockName}
            stockPrice={stockPrice}
            stockRate={stockRate}
            isETF={isETF}
          />
        </div>
        <section className='flex-1'>
          <KlineChart viewCount={60} data={kline} buyDate={buyDate} weekData={weekKline} />
          <RSIChart viewCount={60} data={kline} />
          <CanvasCCIChart viewCount={60} data={kline} />
        </section>
      </section>
    </section>
  )
}

export default Stock
