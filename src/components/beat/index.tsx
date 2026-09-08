import { useEffect, useMemo, memo } from 'react'
import type { CSSProperties } from 'react'
import CountUp from '@/libs/countUp.js'
import { nanoid } from 'nanoid'

// target = 目标元素的 ID；
// startVal = 开始值；
// endVal = 结束值；
// decimals = 小数位数，默认值是0；
// duration = 动画延迟秒数，默认值是2；
// new CountUp(target , startVal, endVal , decimals , duration , options)
const options = {
  useEasing: true,
  useGrouping: true,
  separator: ',',
  decimal: '.',
}
const Beat = memo(
  ({
    num,
    decimals = 0,
    style,
    unit = '',
  }: {
    num: number
    decimals?: number
    style?: CSSProperties
    unit?: string
  }) => {
    const id = useMemo(() => {
      return nanoid()
    }, [])
    useEffect(() => {
      const money = new CountUp(id, 0, num, decimals, 1, options)
      money.start()
    }, [num, id, decimals])
    return (
      <>
        <span id={id} style={style}>
          {num}
        </span>
        <span style={style}> {unit}</span>
      </>
    )
  }
)

export default Beat
