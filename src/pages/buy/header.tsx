import { queryApi } from '@/libs/api'
import { useEffect, useState } from 'react'
const TAB_LIST = [
  { name: 'up_small_gain', label: '均线多头小阳线' },
  { name: 'buy_signal', label: '买入信号' },
  { name: 'long_shadow', label: '超长下影线' },
  { name: 'ma5_reversal_cross', label: 'MA5拐头上穿' },
  { name: 'consecutive_rise', label: '连续上涨' },
  { name: 'volume_surge', label: '巨大量能' },
  { name: 'one_word_up', label: '涨停延续' },
]

const Header = ({
  tab,
  setTab,
  panel,
  setPanel,
}: {
  tab: string
  setTab: (tab: string) => void
  panel: string
  setPanel: (panel: string) => void
}) => {
  const [tabList, setTabList] = useState<string[]>([])
  useEffect(() => {
    queryApi<{ date: string }>(
      `SELECT date FROM ${panel} GROUP BY "date" ORDER BY "date" DESC LIMIT 30`
    ).then((res) => {
      const list = res.map((item: { date: string }) => item.date)
      setTabList(list)
      setTab(list[0])
    })
  }, [panel])
  return (
    <section className='flex mb-4 gap-1 list-none min-h-[28px] items-center'>
      <section className='flex h-[28px] gap-[1px] rounded-sm overflow-hidden mr-2'>
        {TAB_LIST.map((item) => {
          const isActive = panel === item.name
          return (
            <div
              key={item.name}
              onClick={() => setPanel(item.name)}
              className={`cursor-pointer h-[28px] leading-[28px] px-2 text-[11px] ${isActive ? 'bg-emerald-500 text-white' : 'bg-[#2a2e3a] text-gray-500'}`}
            >
              {item.label}
            </div>
          )
        })}
      </section>
      {tabList.map((item) => {
        return (
          <li
            key={item}
            className={`w-[28px] h-[28px] leading-[28px] text-[12px] text-center rounded-sm cursor-pointer ${tab === item ? 'bg-emerald-500 text-white' : 'bg-[#2a2e3a] text-gray-500'}`}
            onClick={() => setTab(item)}
          >
            {item.slice(8)}
          </li>
        )
      })}
    </section>
  )
}

export default Header
