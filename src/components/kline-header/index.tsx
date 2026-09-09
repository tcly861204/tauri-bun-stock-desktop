import { useEffect, useState } from 'react'
import Switch from './switch'
import { useCreateStockModel } from '@/hooks/useCreateStockModel'
const KlineHeader = ({
  stockTime,
  code,
  stockName,
  stockPrice,
  stockRate,
  isETF = false,
  stockExt,
}: {
  stockTime: string
  code: string
  stockName: string
  stockPrice: number
  stockRate: number
  stockExt: {
    turnoverRate: number // 换手率
    pe: number // 市盈
  }
  isETF?: boolean
}) => {
  const { handleStockClick } = useCreateStockModel()
  const [themeName, setThemeName] = useState<string>('')
  const [themeCode, setThemeCode] = useState<string>('')
  const [symbol, setSymbol] = useState<string>('')
  useEffect(() => {
    if (code) {
      const stock = JSON.parse(localStorage.getItem('stock') || '{}')
      if (code.includes('#') || code.includes('-') || code.includes('_')) {
        const _code = code.split(/[\#\-\_]/g)[1]
        setThemeCode(stock[_code]?.themeCode || '')
        setThemeName(stock[_code]?.themeName || '')
        const prefix = stock[_code]?.type === 1 ? 'sh' : stock[_code]?.type === 0 ? 'sz' : 'bj'
        setSymbol(`${prefix}#${_code}`)
      } else {
        setThemeCode(stock[code]?.themeCode || '')
        setThemeName(stock[code]?.themeName || '')
        const prefix = stock[code]?.type === 1 ? 'sh' : stock[code]?.type === 0 ? 'sz' : 'bj'
        setSymbol(`${prefix}#${code}`)
      }
    }
  }, [code])
  return (
    <section
      className={`h-[36px] flex items-center text-sm rounded-t-md leading-[36px] px-4 ${stockRate > 0 ? 'bg-[#f00] text-white' : 'bg-emerald-500 text-white'}`}
    >
      <Switch code={code ? (code.length > 6 ? code.slice(2) : code) : null} />
      <span className='mr-2'>{stockTime}</span>
      {code && code.length > 6 ? code.split(/[\#\-\_]/g)[1] : code}·{stockName}
      <span className='ml-2'>{stockPrice}</span>
      <span className='ml-2'>涨幅:{stockRate}%</span>
      <span className='ml-2'>换手率:{stockExt.turnoverRate}%</span>
      {stockExt.pe < 0 ? (
        <span className='ml-2 bg-fuchsia-500 h-[24px] text-[12px] leading-[24px] text-white px-2 rounded-sm'>
          亏损
        </span>
      ) : null}
      {!isETF ? (
        <span
          className='ml-2 bg-black/30 h-[24px] text-[12px] cursor-pointer leading-[24px] text-white px-1 rounded-sm'
          onClick={() =>
            handleStockClick(`${symbol}`, false, true, themeCode, {
              name: themeName,
              avgChange: 100,
            })
          }
        >
          {themeName}
        </span>
      ) : null}
    </section>
  )
}

export default KlineHeader
