import { queryApi } from '@/libs/api'
import { useEffect, useState } from 'react'
const Header = ({ tab, setTab }: { tab: string; setTab: (tab: string) => void }) => {
  const [tabList, setTabList] = useState<string[]>([])
  useEffect(() => {
    queryApi('SELECT date FROM stock_tops GROUP BY "date" ORDER BY "date" DESC LIMIT 30').then(
      (res) => {
        const list = res.map((item) => item.date)
        setTabList(list)
        setTab(list[0])
      }
    )
  }, [])
  return (
    <section className='flex mb-2 gap-1 list-none min-h-[28px]'>
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
