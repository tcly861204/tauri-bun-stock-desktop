import { FC } from 'react'
export type SidebarItem = {
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
interface Props {
  item: SidebarItem
  active: boolean
  index: number
  onClick: (code: string) => void
}
const StockItem: FC<Props> = ({ item, active, index, onClick }) => {
  const market_cap = item.market_cap
  return (
    <div
      className={`relative overflow-hidden h-[60px] min-h-[60px] flex text-[12px] flex-col gap-0 rounded-md box-border px-3 py-2 cursor-pointer ${active ? 'bg-emerald-500 text-white' : 'bg-[#1e2025] text-gray-500'}`}
      onClick={() => onClick(`${item.type}-${item.code}`)}
    >
      <p className='m-0 p-0 outline-none mb-2 flex'>
        <span className={`mr-1 ${active ? '' : 'text-emerald-500 '}`}>{item.code}</span>
        <span className='flex-1'>{item.name}</span>
      </p>
      <p className='m-0 p-0 outline-none'>
        <span className='mr-2'>{item.price}</span>
        <span className={`${active ? '' : item.profit > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
          {item.profit}%
        </span>
      </p>
      <p className='absolute bottom-1.5 right-2 bg-white/10 rounded-full w-[22px] h-[22px] flex items-center justify-center text-[10px]'>
        {index}
      </p>
      {typeof item.market_cap === 'number' && (
        <p
          className={`absolute top-2 right-2 shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-[500] tracking-[-0.01em] ${
            active
              ? 'bg-white/10 text-white'
              : market_cap > 0
                ? 'bg-[#2ed573]/10 text-[#2ed573]'
                : 'bg-[#ff4757]/10 text-[#ff4757]'
          }`}
        >
          {market_cap > 0 ? `+${market_cap}` : market_cap}
        </p>
      )}
      <div
        className={`absolute top-0 left-0 w-[3px] bottom-0 z-[10] ${active ? '' : (item?.profit || 0) < 0 ? 'bg-green-400' : (item?.profit || 0) > 9.5 ? 'bg-fuchsia-500' : ''}`}
      />
    </div>
  )
}

export default StockItem
