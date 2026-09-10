import { FC } from 'react'

interface Props {
  count?: number
}

// 与 StockItem 共用同一套底色和尺寸，保证骨架屏切到真实列表时不跳动
const bar = 'bg-gradient-to-r from-white/[0.06] via-white/[0.14] to-white/[0.06] animate-shimmer rounded'

const SkeletonItem: FC = () => (
  <div className='relative overflow-hidden h-[60px] min-h-[60px] flex flex-col gap-0 rounded-md box-border px-3 py-2 bg-[#1e2025]'>
    <p className='m-0 p-0 outline-none mb-2 flex items-center'>
      <span className={`${bar} w-[46px] h-[10px] mr-1`} />
      <span className={`${bar} w-[64px] h-[10px]`} />
    </p>
    <p className='m-0 p-0 outline-none flex items-center'>
      <span className={`${bar} w-[38px] h-[9px] mr-2`} />
      <span className={`${bar} w-[30px] h-[9px]`} />
    </p>
    <span className={`${bar} absolute top-2 right-2 w-[34px] h-[16px] rounded-full`} />
    <span className={`${bar} absolute bottom-1.5 right-2 w-[22px] h-[22px] rounded-full`} />
  </div>
)

const Skeleton: FC<Props> = ({ count = 8 }) => (
  <>
    {Array.from({ length: count }, (_, index) => (
      <SkeletonItem key={index} />
    ))}
  </>
)

export default Skeleton
