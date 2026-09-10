import { Plus } from 'lucide-react'
const Header = () => {
  return (
    <section className='flex justify-end mb-4 list-none min-h-[28px] pr-4'>
      <button className='bg-emerald-500 cursor-pointer text-white px-2 rounded-sm border-none'>
        <Plus />
      </button>
    </section>
  )
}

export default Header
