import { useEffect, useState, useMemo, useCallback, useRef, useLayoutEffect } from 'react'
import { getHeatmapData } from '@/libs/api'
import { useCreateStockModel } from '@/hooks/useCreateStockModel'
import { round } from '@/libs/math'
import LoadingSkeleton from '@/components/loading/skeleton'
import SubTitle from './subTitle'
import SubGroup from './subGroup'
import { Search } from 'lucide-react'

/* ─── types ─── */
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
interface IndustryGroup {
  name: string
  avgChange: number
  subList: {
    name: string
    avgChange: number
    stocks: StockData[]
  }[]
  up: number
  down: number
}

/* ─── component ─── */
export default function Heatmap() {
  const { handleStockClick } = useCreateStockModel()
  const [stocks, setStocks] = useState<StockData[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [hovered, setHovered] = useState<{ s: StockData; x: number; y: number } | null>(null)
  const [ts, setTs] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const hasCollapsed = useRef(false)

  /* ── fetch ── */
  const fetchData = useCallback(async () => {
    try {
      const raw = await getHeatmapData()
      const mapped: StockData[] = raw.map((r: any) => ({
        type: r.type,
        code: String(r.code),
        name: r.name ?? '',
        hidden: r.hidden ?? 0,
        sectorCode: r.sectorCode ?? '',
        sectorName: r.sectorName ?? '',
        subSectorName: r.subSectorName ?? '',
        price: r.price ?? 0,
        change: r.change ?? null,
        mcap: r.mcap ?? 0,
      }))
      setStocks(mapped)
      setErr('')
      setTs(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
    } catch {
      setErr('数据加载失败，点击重试')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
    pollRef.current = setInterval(fetchData, 60_000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchData])

  /* ── keep tooltip inside viewport ── */
  useLayoutEffect(() => {
    if (!hovered || !tipRef.current) return
    const el = tipRef.current
    const rect = el.getBoundingClientRect()
    const pad = 16
    let left = hovered.x
    if (rect.right > window.innerWidth - pad) {
      left = window.innerWidth - rect.width / 2 - pad
    }
    if (rect.left < pad) {
      left = rect.width / 2 + pad
    }
    el.style.left = `${left}px`
  }, [hovered])

  /* ── group ── */
  const groups = useMemo(() => {
    const map = new Map<string, StockData[]>()
    stocks.forEach((s) => {
      const sector = s.sectorName || '其他'
      if (!map.has(sector)) map.set(sector, [])
      map.get(sector)!.push(s)
    })

    const result: IndustryGroup[] = []
    map.forEach((list, name) => {
      const ch = list
        .filter((s) => s.change !== null && !s.name.includes('N'))
        .map((s) => s.change!)
      const avg = ch.length ? ch.reduce((a, b) => a + b, 0) / ch.length : 0
      const subMap = new Map<string, StockData[]>()
      list.forEach((s) => {
        const sector = s.subSectorName
        if (!subMap.has(sector)) subMap.set(sector, [])
        subMap.get(sector)!.push(s)
      })
      const subList: {
        name: string
        avgChange: number
        stocks: StockData[]
      }[] = []
      subMap.forEach((sList, sName) => {
        const ch = sList.filter((s) => s.change !== null).map((s) => s.change!)
        const avg = ch.length ? ch.reduce((a, b) => a + b, 0) / ch.length : 0
        const _stocks = sList
          .filter((s) => s.hidden === 0)
          .sort((a, b) => (b.change ?? 0) - (a.change ?? 0))
        if (_stocks.length) {
          subList.push({
            name: sName,
            avgChange: avg,
            stocks: _stocks,
          })
        }
      })
      result.push({
        name,
        avgChange: avg,
        subList,
        up: list.filter((s) => (s.change ?? 0) > 0).length,
        down: list.filter((s) => (s.change ?? 0) < 0).length,
      })
    })

    const q = search.trim()
    if (q) return result.filter((g) => g.name.includes(q))
    result.sort((a, b) => b.avgChange - a.avgChange)
    return result
  }, [stocks, search])

  /* ── collapse all by default on initial load ── */
  useLayoutEffect(() => {
    if (groups.length && !hasCollapsed.current) {
      setCollapsed(new Set(groups.map((g) => g.name)))
      hasCollapsed.current = true
    }
  }, [groups])

  /* ── stats ── */
  const stats = useMemo(() => {
    let up = 0,
      down = 0,
      flat = 0,
      lu = 0,
      ld = 0
    stocks.forEach((s) => {
      if (s.change === null || s.change === 0) flat++
      else if (s.change > 0) {
        up++
        if (s.change >= 9.8) lu++
      } else {
        down++
        if (s.change <= -9.8) ld++
      }
    })
    return { up, down, flat, lu, ld }
  }, [stocks])

  const sentiment = useMemo(() => {
    const total = stocks.length || 1
    return (((stats.up - stats.down) / total) * 100).toFixed(0)
  }, [stocks, stats])

  /* ── render ── */
  if (err && !stocks.length) {
    return (
      <section className='h-full flex items-center justify-center text-gray-400'>
        <button
          onClick={fetchData}
          className='px-6 py-3 bg-[#1e222d] rounded-xl hover:bg-[#2a2e3a] transition-colors text-sm cursor-pointer'
        >
          {err} → 点击重试
        </button>
      </section>
    )
  }

  return (
    <section className="w-full h-[calc(100vh-40px)] overflow-auto overflow-x-hidden scrollbar flex flex-col select-none font-['Outfit',sans-serif]">
      {/* ── header ── */}
      <div className='shrink-0 px-6 pt-5 pb-2 flex items-center justify-between'>
        <div className='flex items-end gap-3'>
          <h1 className='text-base font-bold text-white/90'>🔥 情绪热力图</h1>
          <span className="text-[11px] text-gray-600 font-['JetBrains_Mono',monospace]">{ts}</span>
        </div>
        <button
          onClick={fetchData}
          className='text-xs text-gray-500 hover:text-white/70 transition-colors px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] cursor-pointer'
        >
          ⟳ 刷新
        </button>
      </div>

      {/* ── stats bar ── */}
      <div className='shrink-0 px-6 pb-3 flex items-center gap-2 flex-wrap'>
        {[
          { label: '上涨', val: stats.up, cls: 'text-red-400' },
          { label: '下跌', val: stats.down, cls: 'text-teal-400' },
          { label: '涨停', val: stats.lu, cls: 'text-red-500' },
          { label: '跌停', val: stats.ld, cls: 'text-teal-600' },
          { label: '平盘', val: stats.flat, cls: 'text-gray-500' },
        ].map((s) => (
          <div
            key={s.label}
            className='flex items-center gap-1.5 bg-[#1e222d] rounded-lg px-3 py-1'
          >
            <span className='text-[11px] text-gray-500'>{s.label}</span>
            <span className={`text-sm font-bold ${s.cls} font-['JetBrains_Mono',monospace]`}>
              {s.val.toLocaleString()}
            </span>
          </div>
        ))}
        <div className='flex items-center gap-1.5 bg-[#1e222d] rounded-lg px-3 py-1'>
          <span className='text-[11px] text-gray-500'>情绪分</span>
          <span
            className={`text-sm font-bold font-['JetBrains_Mono',monospace] ${Number(sentiment) > 0 ? 'text-red-400' : 'text-teal-400'}`}
          >
            {Number(sentiment) > 0 ? '+' : ''}
            {sentiment}
          </span>
        </div>
      </div>

      {/* ── toolbar ── */}
      <div className='shrink-0 px-6 pb-3 flex items-center gap-3'>
        <div className='relative flex-1 max-w-xs'>
          <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs'>
            <Search size={14} />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='搜索行业...'
            className='w-full bg-[#1e222d] border border-white/[0.06] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white/70 placeholder:text-gray-600 outline-none focus:border-white/[0.15] transition-colors'
          />
        </div>
        <button
          onClick={() => setCollapsed(new Set())}
          className='text-[11px] text-gray-600 hover:text-white/60 transition-colors cursor-pointer'
        >
          全部展开
        </button>
        <button
          onClick={() => setCollapsed(new Set(groups.map((g) => g.name)))}
          className='text-[11px] text-gray-600 hover:text-white/60 transition-colors cursor-pointer'
        >
          全部收起
        </button>
      </div>

      {/* ── grid ── */}
      <div className='flex-1 overflow-auto px-6 pb-6 scrollbar'>
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <div className='space-y-2'>
            {groups.map((g) => {
              const open = !collapsed.has(g.name)
              return (
                <div
                  key={g.name}
                  className='bg-[#141822]/80 rounded-md border border-white/[0.03] overflow-hidden'
                >
                  {/* industry header */}
                  <div
                    onClick={() =>
                      setCollapsed((p) => {
                        const n = new Set(p)
                        open ? n.add(g.name) : n.delete(g.name)
                        return n
                      })
                    }
                    className='flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors'
                  >
                    <span className='text-[10px] text-gray-600 w-3 text-center transition-transform'>
                      {open ? '▼' : '▶'}
                    </span>
                    <span className='text-xs font-medium text-white/80'>{g.name}</span>
                    <span
                      className="text-[11px] font-['JetBrains_Mono',monospace] font-bold"
                      style={{ color: g.avgChange >= 0 ? '#ef4444' : '#14b8a6' }}
                    >
                      {g.avgChange > 0 ? '+' : ''}
                      {round(g.avgChange, 2)}%
                    </span>
                    <span className='text-[10px] text-gray-600'>
                      <span className='text-red-400/70'>{g.up}</span>
                      <span className='mx-0.5'>/</span>
                      <span className='text-teal-400/70'>{g.down}</span>
                    </span>
                  </div>

                  {/* stock cells */}
                  {open && (
                    <div className='px-4 pb-3.5'>
                      {g.subList.map((sub) => {
                        return (
                          <section key={sub.name}>
                            <SubTitle sub={sub} />
                            <SubGroup
                              sub={sub}
                              setHovered={setHovered}
                              handleStockClick={handleStockClick}
                            />
                          </section>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style>{`@keyframes htip{from{opacity:0}to{opacity:1}}`}</style>
      {/* ── tooltip ── */}
      {hovered && (
        <div
          ref={tipRef}
          className='fixed z-50 pointer-events-none bg-[#0a0f1a]/95 border border-white/[0.1] rounded-xl px-4 py-3 shadow-2xl min-w-max whitespace-nowrap'
          style={{
            left: hovered.x,
            top: hovered.y,
            transform: 'translate(-50%,-100%)',
            animation: 'htip 0.1s ease-out both',
          }}
        >
          <div className='text-sm font-bold text-white/90 mb-1'>{hovered.s.name}</div>
          <div className="text-[11px] text-gray-400 font-['JetBrains_Mono',monospace] space-y-0.5">
            <div>代码: {hovered.s.code}</div>
            <div>价格: {hovered.s.price.toFixed(2)}</div>
            <div
              style={{
                color: hovered.s.change !== null && hovered.s.change >= 0 ? '#ef4444' : '#14b8a6',
              }}
            >
              涨幅:{' '}
              {hovered.s.change !== null
                ? `${hovered.s.change > 0 ? '+' : ''}${hovered.s.change.toFixed(2)}%`
                : '--'}
            </div>
            <div className='text-gray-600'>流通市值: {hovered.s.mcap}亿</div>
          </div>
        </div>
      )}
    </section>
  )
}
