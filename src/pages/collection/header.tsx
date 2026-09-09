const TAB_LIST = [
  { name: 'stock', label: 'STOCK' },
  { name: 'etf', label: 'ETF' },
]
const Header = ({ panel, setPanel }: { panel: string; setPanel: (panel: string) => void }) => {
  return (
    <section className='flex mb-4 gap-1 list-none min-h-[28px] items-center'>
      <section className='flex h-[28px] gap-[1px] rounded-sm overflow-hidden mr-2'>
        {TAB_LIST.map((item) => {
          const isActive = panel === item.name
          return (
            <div
              key={item.name}
              onClick={() => setPanel(item.name)}
              className={`cursor-pointer h-[28px] leading-[28px] w-[50px] text-center text-[11px] ${isActive ? 'bg-emerald-500 text-white' : 'bg-[#2a2e3a] text-gray-500'}`}
            >
              {item.label}
            </div>
          )
        })}
      </section>
    </section>
  )
}

export default Header
