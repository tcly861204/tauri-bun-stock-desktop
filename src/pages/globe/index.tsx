import Loading from '@/components/loading'
import Beat from '@/components/beat'
import { useEffect, useState } from 'react'
import { getGlobalList } from '@/libs/api'
const Global = () => {
  const [loading, setLoading] = useState(true)
  const [globalList, setGlobalList] = useState<any[]>([])
  useEffect(() => {
    setLoading(true)
    getGlobalList()
      .then((res) => {
        setGlobalList(res)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])
  return (
    <section className='p-5'>
      <section className={`grid gap-[1px] rounded-md overflow-hidden grid-cols-8`}>
        {loading ? <Loading /> : null}
        {globalList.map((item: any) => {
          return (
            <div
              className={`text-center relative select-none text-sm py-9 bg-[#14171c] cursor-not-allowed`}
              key={item.f12}
            >
              <dt
                className={`font-bold text-3xl mb-0 ${
                  item.f3 > 0 ? 'text-[#f00]' : 'text-emerald-500'
                }`}
              >
                <Beat num={item.f3} decimals={2} />
                <sub className='text-sm relative top-0 left-[-8px]'>%</sub>
              </dt>
              <dd className='text-gray-700'>{item.f14}</dd>
              <dd className='text-gray-600 absolute right-2 bottom-1'>{item.f2}</dd>
            </div>
          )
        })}
      </section>
    </section>
  )
}

export default Global
