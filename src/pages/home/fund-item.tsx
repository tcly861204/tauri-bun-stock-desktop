import { FundItem } from './types'
import { multiply, divide, subtract, round } from '@/libs/math'
import { Trash, SquarePen } from 'lucide-react'
import { useMemo } from 'react'
import dayjs from 'dayjs'

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
  const canSell = useMemo(() => {
    return item.byDate ? dayjs().diff(dayjs(item.byDate), 'day') >= 7 : false
  }, [item.byDate])
  return (
    <section
      onClick={onSelect}
      className={`relative h-[96px] min-h-[96px] box-border overflow-hidden rounded-md p-3 cursor-pointer ${selected ? 'bg-[#141618]' : 'bg-[#1e2025]'}`}
    >
      {/* 名称行 */}
      <div className='flex items-center justify-between mb-1.5'>
        <p className='text-zinc-500 text-xs font-medium truncate min-w-0 flex-1 flex'>
          <span className='text-emerald-400'>{item.code}</span>·{item.name}
        </p>
        <div
          className={`flex items-center shrink-0 ml-1.5 transition-opacity ${
            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            title='编辑'
            className='p-0.5 rounded cursor-pointer text-zinc-500 hover:text-amber-400'
          >
            <SquarePen size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            title='删除'
            className='p-0.5 rounded cursor-pointer text-zinc-500 hover:text-red-400'
          >
            <Trash size={14} />
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
      <div className='grid grid-cols-3 gap-1 mb-1.5 text-zinc-500 text-[9px] leading-tight'>
        <dl>
          <dt>现价</dt>
          <dd className={`text-xs tabular-nums ${isUp ? 'text-red-400' : 'text-emerald-400'}`}>
            {item.curPrice || '--'}
          </dd>
        </dl>
        <dl>
          <dt>成本</dt>
          <dd className='text-zinc-200 text-xs tabular-nums'>{item.byCostPrice}</dd>
        </dl>
        <dl>
          <dt>持仓</dt>
          <dd className='text-zinc-200 text-xs tabular-nums'>{item.byNum || '--'}</dd>
        </dl>
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
      {selected ? (
        <div className='bg-emerald-500 absolute left-0 top-0 bottom-0 w-[3px]'></div>
      ) : null}
    </section>
  )
}
