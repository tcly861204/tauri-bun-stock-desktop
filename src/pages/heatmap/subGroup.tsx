interface StockData {
  type: number
  code: string
  name: string
  hidden: number
  sectorName: string
  sectorCode: string
  subSectorName: string
  price: number
  change: number | null
  mcap: number
}
/* ─── color helpers ─── */
const COLOR = {
  bg: (c: number | null): string => {
    if (c == null) return '#2a2e3a'
    if (c >= 9.5) return '#b91c1c' /* 涨停 */
    if (c >= 5) return '#dc2626' /* 大涨 */
    if (c >= 2) return '#ea580c' /* 上涨 */
    if (c >= 0.5) return '#f59e0b' /* 微涨 */
    if (c > -0.5) return '#3f4555' /* 平盘 */
    if (c > -2) return '#0d9488' /* 微跌 */
    if (c > -5) return '#0f766e' /* 下跌 */
    if (c > -9.5) return '#115e59' /* 大跌 */
    return '#134e4a' /* 跌停 */
  },
  text: (c: number | null): string => {
    if (c == null) return '#8b8fa3'
    if (c >= 0.5) return '#fff'
    if (c > -0.5) return '#8b8fa3'
    if (c > -2) return '#fff'
    return '#fff'
  },
  glow: (c: number | null): string => {
    if (c == null) return 'transparent'
    const a = Math.min(Math.abs(c) / 12, 0.35)
    if (c >= 0.5) return `rgba(220,38,38,${a})`
    if (c <= -0.5) return `rgba(13,148,136,${a})`
    return 'transparent'
  },
}

const SubGroup = ({
  sub,
  setHovered,
  handleStockClick,
}: {
  sub: { name: string; avgChange: number; stocks: StockData[] }
  setHovered: (s: { s: StockData; x: number; y: number } | null) => void
  handleStockClick: (
    code: string,
    isETF: boolean,
    isTheme: boolean,
    themeCode?: string,
    extInfo?: any
  ) => void
}) => {
  return (
    <div
      className='grid gap-[3px]'
      style={{
        gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
      }}
    >
      {sub.stocks.map((s) => {
        const bg = COLOR.bg(s.change)
        const tc = COLOR.text(s.change)
        const glow = COLOR.glow(s.change)
        return (
          <div
            key={s.code}
            onMouseEnter={(e) => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
              setHovered({
                s,
                x: rect.left + rect.width / 2,
                y: rect.top - 10,
              })
            }}
            onMouseLeave={() => setHovered(null)}
            onClick={() =>
              handleStockClick(
                `${s.type === 1 ? 'sh' : s.type === 0 ? 'sz' : 'bj'}#${s.code}`,
                false,
                true,
                sub.name,
                { name: sub.name, avgChange: sub.avgChange }
              )
            }
            className='relative rounded-md flex flex-col items-center justify-center min-h-[44px] cursor-pointer transition-all duration-150 hover:scale-[1.12] hover:z-10'
            style={{
              background: bg,
              color: tc,
              boxShadow: `0 2px 6px ${glow}`,
            }}
          >
            <span className='text-[11px] leading-tight font-medium truncate w-full text-center px-0.5'>
              {s.name}
            </span>
            <span className="text-[10px] leading-tight font-bold font-['JetBrains_Mono',monospace]">
              {s.change !== null ? `${s.change > 0 ? '+' : ''}${s.change.toFixed(1)}%` : '--'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default SubGroup
