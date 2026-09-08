import { Minus, Minimize, Maximize, X } from 'lucide-react'
import { useState, useLayoutEffect } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'

const Action = () => {
  const [isMaximi, setIsMaximi] = useState<boolean>(false)
  const appWindow = getCurrentWindow()
  useLayoutEffect(() => {
    appWindow.isMaximizable().then((res: boolean) => {
      setIsMaximi(res)
    })
  }, [])
  const minimize = () => appWindow.minimize()
  const toggleMaximize = () =>
    appWindow.toggleMaximize().then(() => {
      setIsMaximi(!isMaximi)
    })
  const close = () => appWindow.hide()
  return (
    <div className='flex gap-3 h-[40px] items-center' onMouseDown={(e) => e.stopPropagation()}>
      <Minus
        className='cursor-pointer text-[#666] hover:text-[#aaa]'
        size={16}
        onClick={minimize}
      />
      {isMaximi ? (
        <Minimize
          size={16}
          className='cursor-pointer text-[#666] hover:text-[#aaa]'
          onClick={toggleMaximize}
        />
      ) : (
        <Maximize
          size={16}
          className='cursor-pointer text-[#666] hover:text-[#aaa]'
          onClick={toggleMaximize}
        />
      )}

      <X size={16} className='cursor-pointer text-[#666] hover:text-[#aaa]' onClick={close} />
    </div>
  )
}

export default Action
