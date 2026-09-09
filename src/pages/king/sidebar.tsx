import { FC, useEffect, useState } from 'react'
import { queryApi } from '@/libs/api'
interface Props {
  tab: string
  selectCode: string
  setSelectCode: (code: string) => void
}
type SidebarItem = {
  type: number
  code: string
  name: string
  lowDay: number
  price?: number
  profit: number
  isYLine: boolean
  isLongShadow: boolean
  market_cap: number
}
const Sidebar: FC<Props> = ({ tab, selectCode, setSelectCode }) => {
  const [sideList, setSideList] = useState<SidebarItem[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    setLoading(true)
    queryApi(
      `SELECT t.*, s."lowDay" FROM stock_tops as t LEFT JOIN sector_stocks as s ON t.code = s.code WHERE t."date" = '${tab}' AND s.is_hidden = 0`
    )
      .then((res) => {
        console.log(res)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [tab])
  return <section className='w-[240px] h-[calc(100vh-140px)] relative flex flex-col pr-1'></section>
}

export default Sidebar
