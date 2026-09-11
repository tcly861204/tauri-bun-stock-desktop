import { RadioTower } from 'lucide-react'
const NoSet = () => {
  return (
    <section className='w-full h-full absolute top-0 left-0 bg-[#1e2025] rounded-md z-100 overflow-hidden flex flex-col items-center justify-center'>
      {/* 品牌光晕 */}
      <span
        aria-hidden
        className='pointer-events-none absolute w-[300px] h-[300px] rounded-full animate-pulse-glow'
        style={{
          background: 'radial-gradient(circle, rgba(255,24,138,0.18) 0%, transparent 70%)',
        }}
      />
      {/* 图标 */}
      <div className='relative animate-scaleIn'>
        <div className='animate-floatSlow2'>
          <div className='w-[68px] h-[68px] rounded-2xl flex items-center justify-center bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm shadow-[0_16px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]'>
            <RadioTower size={30} strokeWidth={1.5} className='text-emerald-400' />
          </div>
        </div>
      </div>
      {/* 文字 */}
      <div className='relative mt-6 flex flex-col items-center gap-2'>
        <p className='animate-fadeInUp [animation-delay:140ms] text-[15px] font-medium tracking-[0.2em] text-gray-200'>
          暂未选择股票
        </p>
        <p className="animate-fadeInUp [animation-delay:280ms] font-['JetBrains_Mono',monospace] text-[11px] tracking-[0.12em] text-gray-500">
          从左侧列表选择股票，即可查看 K 线与信号
        </p>
      </div>
    </section>
  )
}
export default NoSet
