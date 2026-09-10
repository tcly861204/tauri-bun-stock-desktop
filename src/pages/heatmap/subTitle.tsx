import { round } from '@/libs/math'
const SubTitle = ({
  sub,
}: {
  sub: {
    name: string
    avgChange: number
  }
}) => {
  return (
    <div className='mt-2 flex items-center gap-2 pl-2 mb-2 border-l-[3px] border-white/[0.06]'>
      <span className='text-[10px] font-medium uppercase tracking-wider text-white/50'>
        {sub.name}
      </span>
      <span
        className="text-[10px] font-bold font-['JetBrains_Mono',monospace] leading-none px-1.5 py-[2px] rounded-sm"
        style={{
          color: sub.avgChange >= 0 ? '#f87171' : '#2dd4bf',
          background: sub.avgChange >= 0 ? 'rgba(248,113,113,0.1)' : 'rgba(45,212,191,0.1)',
        }}
      >
        {sub.avgChange > 0 ? '+' : ''}
        {round(sub.avgChange, 2)}%
      </span>
    </div>
  )
}

export default SubTitle
