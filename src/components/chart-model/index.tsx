import { useState } from 'react'
import ChartPanel from '../stock/index'
interface Props {
  code: string
  isTheme?: boolean
  isETF?: boolean
  themeCode?: string
  handleClose: () => void
  extInfo?: Record<string, any>
}

const StockChartModel: React.FC<Props> = ({
  code,
  isETF = false,
  isTheme = false,
  themeCode = '',
  handleClose,
  extInfo = {},
}) => {
  const [screen] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })
  const [activeCode, setActiveCode] = useState<string>(
    code.replace('#', '-').replace(/^sh/g, '1').replace(/^sz/g, '0')
  )
  return (
    <section
      className={`fixed cursor-pointer flex shadow-md justify-center items-center left-0 top-0 bg-black/60 z-10`}
      style={{ width: screen.width, height: screen.height }}
      onClick={(event) => event.target === event.currentTarget && handleClose()}
    >
      <section className='w-[calc(100vw-50px)] h-[calc(100vh-124px)] flex gap-2 bg-black rounded-md p-2'>
        <ChartPanel code={activeCode} isETF={isETF} />
      </section>
    </section>
  )
}

export default StockChartModel
