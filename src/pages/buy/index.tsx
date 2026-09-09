import { useState } from 'react'
import Sidebar from './sidebar'
import Stock from '@/components/stock'
import Header from './header'
const Buy = () => {
  const [panel, setPanel] = useState<string>('up_small_gain')
  const [tab, setTab] = useState<string>('')
  const [selectCode, setSelectCode] = useState('')
  return (
    <section className='pt-5 pl-5 w-full relative min-h-[400px]'>
      <Header tab={tab} setTab={setTab} panel={panel} setPanel={setPanel} />
      <section className='flex pr-4'>
        <Sidebar panel={panel} tab={tab} selectCode={selectCode} setSelectCode={setSelectCode} />
        <Stock code={selectCode} buyDate={tab} />
      </section>
    </section>
  )
}

export default Buy
