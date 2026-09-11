import { Plus } from 'lucide-react'
const Header = () => {
  return (
    <section className='flex justify-end mb-4 list-none min-h-[28px] pr-4'>
      <button className='bg-emerald-500 flex items-center justify-center cursor-pointer text-white w-[28px] rounded-sm border-none'>
        <Plus size={14} />
      </button>
    </section>
  )
}

export default Header
