import { Home, Crown, ShoppingCartIcon, Sparkles, Globe, Settings } from 'lucide-react'
import { nanoid } from 'nanoid' // 引入nanoid库
import { useLocation, useNavigate } from 'react-router-dom'
const Menu = [
  { id: nanoid(), label: '涨停', icon: Crown, path: '/king' },
  { id: nanoid(), label: '买入', icon: ShoppingCartIcon, path: '/buy' },
  // { id: nanoid(), label: '扫描', icon: Radar, path: '/scan' },
  { id: nanoid(), label: '首页', icon: Home, path: '/' },
  { id: nanoid(), label: '收藏', icon: Sparkles, path: '/collection' },
  { id: nanoid(), label: '全球', icon: Globe, path: '/globe' },
  { id: nanoid(), label: '设置', icon: Settings, path: '/setting' },
]
const Sidebar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <section className='w-[64px] bg-[#101114] h-full flex items-center flex-col gap-2 pt-5'>
      {Menu.map((item) => {
        const active = item.path === location.pathname
        return (
          <dl
            key={item.id}
            className={`cursor-pointer w-[48px] h-[48px] pt-2 rounded-lg ${
              active
                ? 'bg-[#2bf7ad]/[0.04] text-[#2bf7ad]'
                : 'text-gray-600 hover:text-white hover:bg-white/[0.04] '
            }`}
            onClick={() => {
              navigate(item.path)
            }}
          >
            <dt className='flex justify-center'>
              <item.icon size={18} />
            </dt>
            <dd className='text-[11px] text-center'>{item.label}</dd>
          </dl>
        )
      })}
    </section>
  )
}
export default Sidebar
