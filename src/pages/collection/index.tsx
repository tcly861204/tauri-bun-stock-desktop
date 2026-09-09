import { useState } from 'react'
import Sidebar from './sidebar'
import Stock from '@/components/stock'
import Header from './header'
const Collection = () => {
  const [panel, setPanel] = useState<string>('stock')
  const [selectCode, setSelectCode] = useState('')
  return (
    <section className='pt-5 pl-5 w-full relative min-h-[400px]'>
      <Header panel={panel} setPanel={setPanel} />
      <section className='flex pr-4'>
        <Sidebar panel={panel} selectCode={selectCode} setSelectCode={setSelectCode} />
        <Stock code={selectCode} />
      </section>
    </section>
  )
}

export default Collection
