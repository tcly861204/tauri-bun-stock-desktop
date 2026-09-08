import { Outlet } from 'react-router-dom'
import Top from './top'
import Sidebar from './sidebar'
const Layout = () => {
  return (
    <section className='w-screen h-screen flex flex-col bg-[#0b0c0c]'>
      <Top />
      <section className='flex flex-1'>
        <Sidebar />
        <section className='flex-1'>
          <Outlet />
        </section>
      </section>
    </section>
  )
}

export default Layout
