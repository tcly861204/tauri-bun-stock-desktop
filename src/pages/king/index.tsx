import { useState } from 'react'
import Header from './header'
import Stock from '@/components/stock'
import Sidebar from './sidebar'
const King = () => {
  const [tab, setTab] = useState<string>('')
  const [selectCode, setSelectCode] = useState('')
  return (
    <section className='pt-5 pl-5 w-full relative min-h-[400px]'>
      <Header tab={tab} setTab={setTab} />
      <section className='flex pr-4'>
        <Sidebar tab={tab} selectCode={selectCode} setSelectCode={setSelectCode} />
        <Stock code={selectCode} buyDate={tab} />
      </section>
    </section>
  )
}
export default King
