import { queryApi } from '@/libs/api'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, Trash2 } from 'lucide-react'
import Stock from '@/components/stock'

const View = () => {
  const navigate = useNavigate()
  const [list, setList] = useState<any[]>([])
  const [index, setIndex] = useState(0)
  const [mode, setMode] = useState<'stock' | 'etf'>('stock')
  const listRef = useRef(list)
  listRef.current = list

  const storageKey = `view_index_${mode}`

  const handleClearCache = () => {
    localStorage.removeItem(storageKey)
    setIndex(0)
  }

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    setIndex(saved ? Number(saved) : 0)
  }, [storageKey])

  useEffect(() => {
    queryApi(
      mode === 'etf'
        ? `SELECT type, code, name FROM sector_stocks where is_etf = 1 AND is_hidden = 0`
        : `SELECT type, code, name FROM sector_stocks where is_etf = 0 AND is_hidden = 0`
    ).then((res) => {
      const data = res || []
      if (data.length === 0) return
      setList(data)
      setIndex((prev) => (prev >= data.length ? 0 : prev))
    })
  }, [mode])

  useEffect(() => {
    localStorage.setItem(storageKey, String(index))
  }, [index, storageKey])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const len = listRef.current.length
    if (len === 0) return
    if (e.key === 'ArrowUp') {
      setIndex((prev) => (prev - 1 < 0 ? 0 : prev - 1))
    } else if (e.key === 'ArrowDown') {
      setIndex((prev) => (prev >= len - 1 ? len - 1 : prev + 1))
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
  const selectCode = useMemo(() => {
    try {
      return `${list[index].type}-${list[index].code}`
    } catch (_) {
      return null
    }
  }, [index, list])
  return (
    <section className='w-[100vw] h-[100vh] bg-[#131722] p-4 flex justify-center items-center relative overflow-hidden'>
      {/* bg gradient layers */}
      <div className='absolute inset-0 bg-gradient-to-b from-[#0f1421] via-[#181e30] to-[#0f1421]' />
      <div
        className='absolute top-[-120px] right-[-100px] w-[500px] h-[500px] rounded-full opacity-[0.12] blur-[120px]'
        style={{ background: 'radial-gradient(circle, #ff188a 0%, transparent 70%)' }}
      />
      <div
        className='absolute bottom-[-120px] left-[-100px] w-[500px] h-[500px] rounded-full opacity-[0.1] blur-[120px]'
        style={{ background: 'radial-gradient(circle, #4fc3f7 0%, transparent 70%)' }}
      />

      {/* grid overlay */}
      <div
        className='absolute inset-0 opacity-[0.04]'
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {list.length > 0 ? (
        <>
          <div className='fixed top-3 left-1/2 -translate-x-1/2 z-10 animate-fadeInUp'>
            <div className='relative bg-[#0f1421]/85 backdrop-blur-2xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6),0_8px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)] border border-white/[0.06] px-5 py-3 flex items-center gap-4'>
              {/* top accent glow line */}
              <div className='absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-[#ff188a]/50 to-transparent' />
              <div className='absolute top-0 left-1/2 -translate-x-1/2 w-16 h-[2px] bg-[#ff188a]/20 blur-sm rounded-full' />

              {/* live indicator + counter */}
              <span className='flex items-center gap-2.5 text-xs text-gray-400 mr-1'>
                <span className='relative flex items-center justify-center w-2 h-2'>
                  <span className='absolute inset-0 rounded-full bg-[#2ed573] animate-pulseDot' />
                  <span className='w-1.5 h-1.5 rounded-full bg-[#2ed573]' />
                </span>
                <span className='tracking-wide'>{index + 1}</span>
                <span className='text-gray-600'>/</span>
                <span className='tracking-wide'>{list.length}</span>
              </span>

              <span className='w-[1px] h-5 bg-gradient-to-b from-transparent via-white/[0.08] to-transparent' />

              {/* stock code */}
              <span className="font-['JetBrains_Mono',monospace] text-sm tracking-wider text-[#4fc3f7] font-medium">
                {list[index].code}
              </span>

              <span className='w-[1px] h-5 bg-gradient-to-b from-transparent via-white/[0.08] to-transparent' />

              {/* stock name */}
              <span className='text-sm text-gray-200/90 tracking-wide'>{list[index].name}</span>
            </div>
          </div>

          {/* top-right actions */}
          <div className='fixed top-3 right-4 z-10 flex items-center gap-2'>
            <span className='w-[1px] self-stretch bg-gradient-to-b from-transparent via-white/[0.06] to-transparent' />
            <div className='flex bg-[#0f1421]/85 backdrop-blur-2xl border border-white/[0.06] rounded-xl overflow-hidden'>
              <button
                onClick={() => setMode('stock')}
                className={`cursor-pointer px-3 py-2 text-xs font-medium tracking-wide transition-all duration-300 ${
                  mode === 'stock'
                    ? 'bg-[#4fc3f7]/15 text-[#4fc3f7] shadow-[inset_0_0_12px_rgba(79,195,247,0.15)]'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                股票
              </button>
              <span className='w-[1px] self-stretch bg-gradient-to-b from-transparent via-white/[0.06] to-transparent' />
              <button
                onClick={() => setMode('etf')}
                className={`cursor-pointer px-3 py-2 text-xs font-medium tracking-wide transition-all duration-300 ${
                  mode === 'etf'
                    ? 'bg-[#ff188a]/15 text-[#ff188a] shadow-[inset_0_0_12px_rgba(255,24,138,0.15)]'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                ETF
              </button>
            </div>

            <button
              onClick={() => navigate('/')}
              className='cursor-pointer bg-[#0f1421]/85 backdrop-blur-2xl border border-white/[0.06] rounded-xl p-2.5 text-gray-400 hover:text-[#4fc3f7] hover:border-[#4fc3f7]/30 hover:shadow-[-2px_0_16px_rgba(79,195,247,0.12)] transition-all duration-300 group'
              title='返回首页'
            >
              <Home size={16} className='transition-transform duration-300 group-hover:scale-110' />
            </button>
            <span className='w-[1px] self-stretch bg-gradient-to-b from-transparent via-white/[0.06] to-transparent' />
            <button
              onClick={handleClearCache}
              className='cursor-pointer bg-[#0f1421]/85 backdrop-blur-2xl border border-white/[0.06] rounded-r-xl p-2.5 text-gray-400 hover:text-[#ff4757] hover:border-[#ff4757]/30 hover:shadow-[2px_0_16px_rgba(255,71,87,0.12)] transition-all duration-300 group'
              title='清除位置缓存'
            >
              <Trash2
                size={16}
                className='transition-transform duration-300 group-hover:scale-110'
              />
            </button>
          </div>
          <div className='relative w-[1890px] h-[810px]'>
            {selectCode ? <Stock code={selectCode} /> : null}
          </div>
        </>
      ) : null}
    </section>
  )
}

export default View
