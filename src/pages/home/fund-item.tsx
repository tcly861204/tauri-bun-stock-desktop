import { FundItem } from './types'
import { multiply, divide, subtract, round } from '@/libs/math'
import { Trash, SquarePen } from 'lucide-react'

interface FundCardProps {
  item: FundItem
  selected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}

/** 计算当前持仓的浮动盈亏与收益率 */
const calcProfit = (item: FundItem) => {
  if (!item.curPrice) return { profit: 0, yieldRate: 0 }
  const cost = Number(item.byCostPrice)
  const price = Number(item.curPrice)
  return {
    profit: multiply(subtract(price, cost), item.byNum),
    yieldRate: round(multiply(divide(subtract(price, cost), cost), 100), 2),
  }
}

export const FundCard = ({ item, selected, onSelect, onEdit, onDelete }: FundCardProps) => {
  const { profit, yieldRate } = calcProfit(item)
  const isUp = item.change >= 0
  const canSell = item.byDate
    ? (new Date().getTime() - new Date(item.byDate).getTime()) / 86400000 >= 7
    : false

  return (
    <section
      className={`group relative rounded-lg px-3 py-2.5 border cursor-pointer transition-all duration-200 ${
        selected
          ? 'bg-gradient-to-b from-amber-400/[0.08] via-[#212127] to-[#1b1b20] border-amber-400/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_28px_rgba(0,0,0,0.45)]'
          : 'bg-gradient-to-b from-[#232329] to-[#1b1b20] border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-amber-400/25 hover:from-[#26262d]'
      }`}
      onClick={onSelect}
    >
      {selected && (
        <span className='absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-amber-400/80' />
      )}

      {/* 名称行 */}
      <div className='flex items-center justify-between mb-1.5'>
        <p className='text-zinc-400 text-xs font-medium truncate min-w-0 flex-1 flex'>
          <span className='text-emerald-400'>{item.code}</span>·{item.name}
        </p>
        <div
          className={`flex items-center gap-1 shrink-0 ml-1.5 transition-opacity ${
            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            title='编辑'
            className='p-0.5 rounded text-zinc-500 hover:text-amber-400'
          >
            <SquarePen size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            title='删除'
            className='p-0.5 rounded text-zinc-500 hover:text-red-400'
          >
            <Trash size={12} />
          </button>
        </div>
        {item.curPrice && (
          <span
            className={`shrink-0 ml-1.5 text-[10px] font-medium ${
              isUp ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {isUp ? '+' : ''}
            {item.change}%
          </span>
        )}
      </div>

      {/* 数据行 */}
      <div className='grid grid-cols-3 gap-1 mb-1.5'>
        <div>
          <p className='text-zinc-500 text-[9px] leading-tight'>现价</p>
          <p className={`text-xs tabular-nums ${isUp ? 'text-red-400' : 'text-emerald-400'}`}>
            {item.curPrice || '--'}
          </p>
        </div>
        <div>
          <p className='text-zinc-500 text-[9px] leading-tight'>成本</p>
          <p className='text-zinc-200 text-xs tabular-nums'>{item.byCostPrice}</p>
        </div>
        <div>
          <p className='text-zinc-500 text-[9px] leading-tight'>持仓</p>
          <p className='text-zinc-200 text-xs tabular-nums'>{item.byNum}</p>
        </div>
      </div>

      {/* 盈亏行 */}
      <div className='flex items-center justify-between'>
        <span className='text-zinc-500 text-[9px]'>
          {item.curDate || item.byDate}
          {canSell && (
            <span className='ml-1.5 text-emerald-500/80 text-[8px] border border-emerald-500/30 rounded px-1 py-0.5'>
              可售
            </span>
          )}
        </span>
        <span
          className={`text-xs font-medium tabular-nums ${
            profit >= 0 ? 'text-red-400' : 'text-emerald-400'
          }`}
        >
          {profit >= 0 ? '+' : ''}
          {round(profit, 2)}
          <span className={`ml-1 text-[10px] ${profit >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {profit >= 0 ? '+' : ''}
            {yieldRate}%
          </span>
        </span>
      </div>
    </section>
  )
}
