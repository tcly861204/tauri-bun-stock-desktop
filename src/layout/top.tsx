import { getCurrentWindow } from '@tauri-apps/api/window'
import { useEffect, useState } from 'react'
import { getTopIndex } from '@/libs/api'
import { isWorking, isTrending, toNum } from '@/libs/utils'
import logoImg from '@/assets/logo.png'
import Action from './action'
const Top = () => {
  const [list, setList] = useState<any[]>([])
  const appWindow = getCurrentWindow()
  const startDrag = () => {
    appWindow.startDragging()
  }
  useEffect(() => {
    const timer = setInterval(
      () => {
        if (isWorking() && isTrending()) {
          getTopIndex().then((res: any) => setList(res))
        }
      },
      5 * 60 * 1000
    )
    getTopIndex().then((res: any) => setList(res))
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [])
  return (
    <section className='h-[40px] flex px-3 bg-[#1a1e23]' onMouseDown={startDrag}>
      <div className='flex items-center'>
        <img src={logoImg} className='w-[28px]' />
      </div>
      <div className='flex-1 flex justify-center'>
        {list.map((item: any) => (
          <dl
            className='flex text-gray-400 cursor-pointer hover:text-gray-200 transition-colors duration-200'
            key={item.code}
          >
            <dd className="px-[10px] text-sm flex items-center font-['JetBrains_Mono',monospace] tracking-[-0.01em]">
              <span className={`mr-1 ${item.change > 0 ? 'text-[#ff4757]' : 'text-[#2ed573]'}`}>
                {toNum(item.change)}%
              </span>
              <span className='text-[12px] text-gray-400'>
                {item.name} <span className='text-gray-600'>|</span> {item.vol}
              </span>
            </dd>
          </dl>
        ))}
      </div>
      <Action />
    </section>
  )
}

export default Top
