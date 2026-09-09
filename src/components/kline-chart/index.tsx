import { useMemo, useRef, useEffect, useState } from 'react'
import { calculateMA } from '@/libs/calculate'
import { findLocalMinIndices } from '@/libs/utils'
import MACDChart from '../macd-chat'
import { drawNuclearWarning } from './drawWarningEffect'
import { drawBuySignal } from './useDrawBuySignal'
import { useLastLowBreakoutBuy, useSellSignalIndices } from './useSignal'
const MA_TYPES = ['ma5', 'ma10', 'ma20', 'ma60'] as const
type MaType = (typeof MA_TYPES)[number]
const MA_VISIBILITY_KEY = 'kline-chart-ma-visibility'
const MA_VISIBILITY_DEFAULT: Record<MaType, boolean> = {
  ma5: true,
  ma10: true,
  ma20: true,
  ma60: true,
}

interface Props {
  height?: number
  viewCount?: number
  buyDate?: string
  data: [string, string, string, string, string, string][]
  weekData: [string, string, string, string, string, string][]
}

const Kline: React.FC<Props> = ({ data, buyDate, weekData, height = 288, viewCount = 80 }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [visibleStart, setVisibleStart] = useState(0)
  const [visibleCount, setVisibleCount] = useState(viewCount)
  const [isDragging, setIsDragging] = useState(false)
  const isDraggingRef = useRef(false)
  const dragStartXRef = useRef(0)
  const dragStartVisibleStartRef = useRef(0)
  const [riskPulse, setRiskPulse] = useState(0)
  const [buyPulse, setBuyPulse] = useState(0)
  const [hoveredLegend, setHoveredLegend] = useState<number | null>(null)
  const [maVisibility, setMaVisibility] = useState<Record<MaType, boolean>>(() => {
    const saved = localStorage.getItem(MA_VISIBILITY_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return { ...MA_VISIBILITY_DEFAULT, ...parsed }
      } catch {
        /* 忽略损坏的缓存数据 */
      }
    }
    return MA_VISIBILITY_DEFAULT
  })
  const dragMovedRef = useRef(false)

  // 全量 K 线数据（用于信号计算，保证信号不受拖动窗口影响）
  const fullKLines = useMemo(() => {
    return data.map((item) => {
      const [time, open, close, high, low, volume] = item
      return {
        time,
        open: parseFloat(open),
        close: parseFloat(close),
        high: parseFloat(high),
        low: parseFloat(low),
        volume: parseFloat(volume),
      }
    })
  }, [data])

  // 全量均线数据（用于信号计算）
  const fullAverage = useMemo(() => {
    return calculateMA(data)
  }, [data])

  const kLines = useMemo(() => {
    const end = Math.min(visibleStart + visibleCount, data.length)
    return fullKLines.slice(visibleStart, end)
  }, [fullKLines, visibleStart, visibleCount])

  const average = useMemo(() => {
    const end = Math.min(visibleStart + visibleCount, data.length)
    return fullAverage.slice(visibleStart, end)
  }, [fullAverage, visibleStart, visibleCount])

  // 在可见 K 线中查找 buyDate 对应的索引
  const buyDateIndex = useMemo(() => {
    if (!buyDate) return -1
    return kLines.findIndex((k) => k.time === buyDate)
  }, [buyDate, kLines])

  // 买入/卖出信号：基于全量数据计算绝对索引，再过滤可见范围
  const allBuySignalIndices = useLastLowBreakoutBuy(fullKLines, fullAverage)
  const allSellSignalIndices = useSellSignalIndices(fullKLines, fullAverage)

  const buySignalIndices = useMemo(() => {
    const end = visibleStart + visibleCount
    return allBuySignalIndices
      .filter((i) => i >= visibleStart && i < end)
      .map((i) => i - visibleStart)
  }, [allBuySignalIndices, visibleStart, visibleCount])

  const sellSignalIndices = useMemo(() => {
    const end = visibleStart + visibleCount
    return allSellSignalIndices
      .filter((i) => i >= visibleStart && i < end)
      .map((i) => i - visibleStart)
  }, [allSellSignalIndices, visibleStart, visibleCount])

  // 数据变化时重置视图到最后位置
  useEffect(() => {
    const count = Math.min(viewCount, data.length)
    setVisibleCount(count)
    setVisibleStart(Math.max(0, data.length - count))
  }, [data])

  // 脉冲动画（风险 + 买入信号）
  useEffect(() => {
    let dir1 = 1
    let val1 = 0.4
    let dir2 = 1
    let val2 = 0.0
    const id = setInterval(() => {
      val1 += dir1 * 0.04
      if (val1 >= 1) dir1 = -1
      if (val1 <= 0.3) dir1 = 1
      setRiskPulse(val1)

      val2 += dir2 * 0.04
      if (val2 >= 1) dir2 = -1
      if (val2 <= 0.3) dir2 = 1
      setBuyPulse(val2)
    }, 60)
    return () => clearInterval(id)
  }, [])

  // 均线显隐持久化到 localStorage
  useEffect(() => {
    localStorage.setItem(MA_VISIBILITY_KEY, JSON.stringify(maVisibility))
  }, [maVisibility])

  useEffect(() => {
    if (!canvasRef.current || kLines.length === 0) return
    const canvas = canvasRef.current
    if (!canvas || kLines.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvas.offsetWidth * dpr
    canvas.height = canvas.offsetHeight * dpr
    const rect = canvas.getBoundingClientRect()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, rect.width, rect.height)
    // 计算K线图的参数
    const padding = { top: 20, right: 5, bottom: 30, left: 50 }
    const chartWidth = rect.width - padding.left - padding.right
    const chartHeight = rect.height - padding.top - padding.bottom

    // 找出最高价和最低价
    const highestPrice = Math.max(...kLines.map((item) => item.high))
    const lowestPrice = Math.min(...kLines.map((item) => item.low))
    const priceRange = highestPrice - lowestPrice

    // 计算每个K线的宽度和间距
    const candleWidth = (chartWidth / kLines.length) * 0.8
    const spacing = (chartWidth / kLines.length) * 0.2

    // 绘制Y轴刻度
    const yTickCount = 5
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#999'
    for (let i = 0; i <= yTickCount; i++) {
      const y = padding.top + (chartHeight / yTickCount) * i
      const price = highestPrice - (priceRange / yTickCount) * i
      ctx.beginPath()
      ctx.strokeStyle = '#999'
      ctx.lineWidth = 1
      ctx.moveTo(padding.left - 5, y)
      ctx.lineTo(padding.left, y)
      ctx.stroke()
      ctx.fillText(price.toFixed(2), padding.left - 8, y)

      // 添加水平网格线
      ctx.beginPath()
      ctx.strokeStyle = '#ccc'
      ctx.lineWidth = 0.5
      ctx.setLineDash([3, 3])
      ctx.moveTo(padding.left, y)
      ctx.lineTo(rect.width - padding.right, y)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // 价格在MA5下方且MA5从上到下时 → 核爆级警告效果
    if (average && average.length > 0) {
      const lastAvg = average[average.length - 1]
      const lastK = kLines[kLines.length - 1]
      const prevAvg = average.length > 1 ? average[average.length - 2] : null
      if (
        lastAvg &&
        lastAvg.ma5 !== undefined &&
        ((lastK.close + lastK.open) / 2 < lastAvg.ma5 ||
          (prevAvg && prevAvg.ma5 !== undefined && lastAvg.ma5 < prevAvg.ma5))
      ) {
        drawNuclearWarning({ ctx, padding, chartWidth, chartHeight, riskPulse })
      }
    }

    // 买入氛围：收盘价 > MA5 > MA10（多头排列）
    if (average && average.length > 0 && kLines.length > 0) {
      const lastAvg = average[average.length - 1]
      const lastK = kLines[kLines.length - 1]
      if (
        lastAvg &&
        lastAvg.ma5 !== undefined &&
        lastAvg.ma5 > 0 &&
        lastAvg.ma10 !== undefined &&
        lastK.close > lastAvg.ma5 &&
        lastAvg.ma5 > lastAvg.ma10
      ) {
        drawBuySignal({ ctx, padding, chartWidth, chartHeight, pulse: buyPulse })
      }
    }

    // 绘制K线
    kLines.forEach((kLine, index) => {
      const x = padding.left + (candleWidth + spacing) * index + spacing / 2

      // 每隔几个K线绘制垂直网格线
      if (index % 5 === 0) {
        ctx.beginPath()
        ctx.strokeStyle = '#ccc'
        ctx.lineWidth = 0.5
        ctx.setLineDash([3, 3])
        ctx.moveTo(x + candleWidth / 2, padding.top)
        ctx.lineTo(x + candleWidth / 2, rect.height - padding.bottom)
        ctx.stroke()
        ctx.setLineDash([])
      }

      // 计算开盘价、收盘价、最高价和最低价的Y坐标
      const openY = padding.top + chartHeight * (1 - (kLine.open - lowestPrice) / priceRange)
      const closeY = padding.top + chartHeight * (1 - (kLine.close - lowestPrice) / priceRange)
      const highY = padding.top + chartHeight * (1 - (kLine.high - lowestPrice) / priceRange)
      const lowY = padding.top + chartHeight * (1 - (kLine.low - lowestPrice) / priceRange)

      // 判断 MA5/MA10/MA20/MA60 是否全部穿越当前 K 线实体
      const avg = average[index]
      const bodyLow = Math.min(kLine.open, kLine.close)
      const bodyHigh = Math.max(kLine.open, kLine.close)
      const isAllMaCross =
        avg &&
        avg.ma5 > bodyLow &&
        avg.ma5 < bodyHigh &&
        avg.ma10 > bodyLow &&
        avg.ma10 < bodyHigh &&
        avg.ma20 > bodyLow &&
        avg.ma20 < bodyHigh &&
        avg.ma60 > bodyLow &&
        avg.ma60 < bodyHigh

      // 四线穿阳/阴 → 蓝色，否则默认红涨绿跌
      let wickColor: string
      let bodyColor: string
      if (isAllMaCross) {
        wickColor = '#2196F3'
        bodyColor = hoveredIndex === index ? '#64B5F6' : '#2196F3'
      } else if (kLine.close >= kLine.open) {
        wickColor = 'red'
        bodyColor = hoveredIndex === index ? '#ff6666' : 'red'
      } else {
        wickColor = 'green'
        bodyColor = hoveredIndex === index ? '#66cc66' : 'green'
      }

      // 绘制影线
      ctx.beginPath()
      ctx.strokeStyle = wickColor
      ctx.moveTo(x + candleWidth / 2, highY)
      ctx.lineTo(x + candleWidth / 2, lowY)
      ctx.stroke()

      // 绘制K线实体
      ctx.fillStyle = bodyColor
      const candleHeight = Math.abs(closeY - openY)
      ctx.fillRect(x, Math.min(openY, closeY), candleWidth, candleHeight || 1)

      // 每隔几个K线显示时间
      if (index % 5 === 0) {
        ctx.beginPath()
        ctx.strokeStyle = '#999'
        ctx.lineWidth = 1
        ctx.moveTo(x + candleWidth / 2, rect.height - padding.bottom + 5)
        ctx.lineTo(x + candleWidth / 2, rect.height - padding.bottom + 10)
        ctx.stroke()

        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillStyle = '#999'
        ctx.fillText(
          kLine.time.substring(5),
          x + candleWidth / 2,
          rect.height - padding.bottom + 10
        )
      }
    })

    // 绘制均线
    if (average && average.length > 0) {
      const maColors = {
        ma5: '#5682ff',
        ma10: '#f0d070',
        ma20: '#ffb0ff',
        ma60: '#008000',
      }

      // 绘制图例
      const legendItems: { name: string; color: string; type: MaType }[] = [
        { name: 'MA5', color: maColors.ma5, type: 'ma5' },
        { name: 'MA10', color: maColors.ma10, type: 'ma10' },
        { name: 'MA20', color: maColors.ma20, type: 'ma20' },
        { name: 'MA60', color: maColors.ma60, type: 'ma60' },
      ]

      let legendX = padding.left
      const legendY = padding.top - 10

      legendItems.forEach((item, idx) => {
        const hidden = !maVisibility[item.type]
        const hovered = hoveredLegend === idx
        ctx.fillStyle = hidden ? '#ccc' : item.color
        ctx.fillRect(legendX, legendY, 15, 3)
        ctx.fillStyle = hidden ? '#ccc' : hovered ? '#111' : '#333'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(item.name, legendX + 20, legendY)
        // if (hidden) {
        //   ctx.strokeStyle = '#ccc'
        //   ctx.lineWidth = 1
        //   ctx.beginPath()
        //   ctx.moveTo(legendX, legendY - 6)
        //   ctx.lineTo(legendX + 15, legendY + 6)
        //   ctx.stroke()
        // }
        legendX += 70
      })

      // 绘制各种均线
      const maTypes = MA_TYPES

      maTypes.forEach((maType) => {
        if (!maVisibility[maType]) return

        ctx.beginPath()
        ctx.strokeStyle = maColors[maType]
        ctx.lineWidth = 1

        let isFirstValidPoint = true

        average.forEach((item, index) => {
          if (item[maType] !== undefined && !isNaN(item[maType])) {
            const x = padding.left + (candleWidth + spacing) * index + spacing / 2 + candleWidth / 2
            const y = padding.top + chartHeight * (1 - (item[maType] - lowestPrice) / priceRange)

            if (isFirstValidPoint) {
              ctx.moveTo(x, y)
              isFirstValidPoint = false
            } else {
              ctx.lineTo(x, y)
            }
          }
        })
        ctx.stroke()
      })

      // 绘制收盘价局部最低点标记（黑色圆点，左右各看5根K线）
      const closeValues = average.map((a) => a.close)
      const lowIndices = findLocalMinIndices(closeValues, 5)
      lowIndices.forEach((i) => {
        const kLine = kLines[i]
        const dotX = padding.left + (candleWidth + spacing) * i + spacing / 2 + candleWidth / 2
        const dotY = padding.top + chartHeight * (1 - (kLine.low - lowestPrice) / priceRange) + 6
        ctx.beginPath()
        ctx.fillStyle = 'black'
        ctx.arc(dotX, dotY, 3, 0, Math.PI * 2)
        ctx.fill()
      })

      // 绘制金叉买入信号标记（绿色向上箭头）
      buySignalIndices.forEach((i) => {
        const kLine = kLines[i]
        const x = padding.left + (candleWidth + spacing) * i + spacing / 2 + candleWidth / 2
        const priceY = padding.top + chartHeight * (1 - (kLine.low - lowestPrice) / priceRange)
        const arrowY = priceY + 10
        const s = 7

        ctx.beginPath()
        ctx.moveTo(x, arrowY - s)
        ctx.lineTo(x - s, arrowY)
        ctx.lineTo(x + s, arrowY)
        ctx.closePath()
        ctx.fillStyle = '#00cc44'
        ctx.shadowColor = '#00cc44'
        ctx.shadowBlur = 6
        ctx.fill()
        ctx.shadowBlur = 0
      })

      // 绘制死叉卖出信号标记（红色向下箭头）
      sellSignalIndices.forEach((i) => {
        const kLine = kLines[i]
        const x = padding.left + (candleWidth + spacing) * i + spacing / 2 + candleWidth / 2
        const priceY = padding.top + chartHeight * (1 - (kLine.high - lowestPrice) / priceRange)
        const arrowY = priceY - 10
        const s = 7

        ctx.beginPath()
        ctx.moveTo(x, arrowY + s)
        ctx.lineTo(x - s, arrowY)
        ctx.lineTo(x + s, arrowY)
        ctx.closePath()
        ctx.fillStyle = '#ff4444'
        ctx.shadowColor = '#ff4444'
        ctx.shadowBlur = 6
        ctx.fill()
        ctx.shadowBlur = 0
      })
    }

    // 绘制 buyDate 买入标记（放在所有 K 线绘制之后，避免被遮挡）
    if (buyDateIndex >= 0) {
      const i = buyDateIndex
      const kLine = kLines[i]
      const x = padding.left + (candleWidth + spacing) * i + spacing / 2 + candleWidth / 2
      const highY = padding.top + chartHeight * (1 - (kLine.high - lowestPrice) / priceRange)
      const markerY = highY - 28

      // 发光圆形背景
      const grad = ctx.createRadialGradient(x, markerY, 0, x, markerY, 18)
      grad.addColorStop(0, 'rgba(255, 64, 64, 0.3)')
      grad.addColorStop(1, 'rgba(255, 64, 64, 0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(x, markerY, 18, 0, Math.PI * 2)
      ctx.fill()

      // 红色填充圆
      ctx.beginPath()
      ctx.arc(x, markerY, 10, 0, Math.PI * 2)
      ctx.fillStyle = '#ff4444'
      ctx.shadowColor = '#ff4444'
      ctx.shadowBlur = 10
      ctx.fill()
      ctx.shadowBlur = 0

      // 白色「买」字
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 11px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('买', x, markerY + 0.5)

      // 虚连线到 K 线最高点（留 4px 间距）
      ctx.beginPath()
      ctx.strokeStyle = '#ff4444'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 2])
      ctx.moveTo(x, markerY + 10)
      ctx.lineTo(x, highY - 6)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // 绘制工具提示
    if (hoveredIndex !== null && hoveredIndex < kLines.length) {
      const kLine = kLines[hoveredIndex]
      const prevClose = hoveredIndex > 0 ? kLines[hoveredIndex - 1].close : kLine.open
      const changePercent = ((kLine.close - prevClose) / prevClose) * 100
      const changeStr = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`

      const ma = average[hoveredIndex]
      const maLines: string[] = []
      if (ma) {
        if (ma.ma5 && maVisibility.ma5) maLines.push(`MA5: ${ma.ma5.toFixed(2)}`)
        if (ma.ma10 && maVisibility.ma10) maLines.push(`MA10: ${ma.ma10.toFixed(2)}`)
        if (ma.ma20 && maVisibility.ma20) maLines.push(`MA20: ${ma.ma20.toFixed(2)}`)
        if (ma.ma60 && maVisibility.ma60) maLines.push(`MA60: ${ma.ma60.toFixed(2)}`)
      }

      const tooltipLines = [
        `日期: ${kLine.time}`,
        `涨幅: ${changeStr}`,
        `开盘: ${kLine.open.toFixed(2)}`,
        `收盘: ${kLine.close.toFixed(2)}`,
        `最高: ${kLine.high.toFixed(2)}`,
        `最低: ${kLine.low.toFixed(2)}`,
        ...maLines,
      ]

      ctx.font = '12px Arial'
      const maxTextWidth = Math.max(...tooltipLines.map((line) => ctx.measureText(line).width))
      const tooltipWidth = maxTextWidth + 16
      const tooltipHeight = tooltipLines.length * 16 + 8

      // 横向放置提示：右侧优先，垂直居中于鼠标
      let tooltipX = mousePos.x + 10
      let tooltipY = mousePos.y - tooltipHeight / 2

      // 右侧放不下则移到左侧
      if (tooltipX + tooltipWidth > rect.width) {
        tooltipX = mousePos.x - tooltipWidth - 10
      }
      // 垂直方向不超出画布
      if (tooltipY < 0) tooltipY = 0
      if (tooltipY + tooltipHeight > rect.height) {
        tooltipY = rect.height - tooltipHeight
      }

      // 绘制工具提示背景
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight)

      // 绘制工具提示文字
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      tooltipLines.forEach((line, index) => {
        ctx.fillText(line, tooltipX + 8, tooltipY + 8 + index * 16)
      })
    }
  }, [
    kLines,
    average,
    hoveredIndex,
    mousePos,
    riskPulse,
    buyPulse,
    buySignalIndices,
    sellSignalIndices,
    buyDateIndex,
    maVisibility,
    hoveredLegend,
  ])

  const handleMouseDown = () => {
    isDraggingRef.current = true
    dragMovedRef.current = false
    setIsDragging(true)
    dragStartXRef.current = 0 // will be set on first mousemove via clientX diff
  }

  const handleLegendClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const legendY = 20 - 10
    if (y < legendY - 8 || y > legendY + 8) return
    const idx = Math.floor((x - 50) / 70)
    if (idx < 0 || idx >= MA_TYPES.length) return
    const type = MA_TYPES[idx]
    setMaVisibility((prev) => ({ ...prev, [type]: !prev[type] }))
  }

  const handleMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const wasPressed = isDraggingRef.current
    isDraggingRef.current = false
    setIsDragging(false)
    if (wasPressed && !dragMovedRef.current) {
      handleLegendClick(event)
    }
    dragMovedRef.current = false
  }

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !kLines.length) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // 图例悬停检测
    const legendY = 20 - 10
    if (y >= legendY - 8 && y <= legendY + 8) {
      const idx = Math.floor((x - 50) / 70)
      setHoveredLegend(idx >= 0 && idx < MA_TYPES.length ? idx : null)
    } else {
      setHoveredLegend(null)
    }

    // 拖拽平移
    if (isDraggingRef.current) {
      dragMovedRef.current = true
      const chartWidth = rect.width - 50 - 5
      const kLineStep = chartWidth / kLines.length
      // 首次进入拖拽时记录起点
      if (dragStartXRef.current === 0) {
        dragStartXRef.current = event.clientX
        dragStartVisibleStartRef.current = visibleStart
      }
      const dx = event.clientX - dragStartXRef.current
      const offset = Math.round(-dx / kLineStep)
      const maxStart = Math.max(0, data.length - visibleCount)
      setVisibleStart(Math.max(0, Math.min(maxStart, dragStartVisibleStartRef.current + offset)))
      return
    }

    setMousePos({ x, y })

    // 计算鼠标悬停的K线
    const padding = { left: 50, right: 5 }
    const chartWidth = rect.width - padding.left - padding.right
    const candleWidth = (chartWidth / kLines.length) * 0.8
    const spacing = (chartWidth / kLines.length) * 0.2

    let newHoveredIndex: number | null = null

    for (let i = 0; i < kLines.length; i++) {
      const candleX = padding.left + (candleWidth + spacing) * i + spacing / 2
      if (x >= candleX && x <= candleX + candleWidth) {
        newHoveredIndex = i
        break
      }
    }

    setHoveredIndex(newHoveredIndex)
  }

  const handleMouseLeave = () => {
    setHoveredIndex(null)
    setHoveredLegend(null)
    isDraggingRef.current = false
    setIsDragging(false)
  }

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const canvas = canvasRef.current
    if (!canvas || !kLines.length) return

    const delta = event.deltaY > 0 ? 5 : -5
    const newCount = Math.max(10, Math.min(data.length, visibleCount + delta))
    if (newCount === visibleCount) return

    // 计算鼠标位置在可见区域中的相对比例
    const rect = canvas.getBoundingClientRect()
    const mouseX = event.clientX - rect.left
    const padding = { left: 50, right: 5 }
    const chartWidth = rect.width - padding.left - padding.right

    let ratio = 0.5
    const stepWidth = chartWidth / kLines.length
    for (let i = 0; i < kLines.length; i++) {
      const x = padding.left + stepWidth * i
      if (mouseX >= x && mouseX <= x + stepWidth) {
        ratio = (i + 0.5) / kLines.length
        break
      }
    }

    // 调整 visibleStart 使鼠标所在的 K 线保持原位
    const absoluteIndex = visibleStart + Math.round(ratio * kLines.length)
    const newStart = Math.round(absoluteIndex - ratio * newCount)
    const maxStart = Math.max(0, data.length - newCount)
    setVisibleStart(Math.max(0, Math.min(maxStart, newStart)))
    setVisibleCount(newCount)
  }

  // const risk = useMemo(() => {
  //   const end = Math.min(visibleStart + visibleCount, data.length)
  //   return calcShortTermRisk(data.slice(0, end))
  // }, [data, visibleStart, visibleCount])

  return (
    <section className='relative flex mb-[1px] gap-[1px]'>
      <div
        className={`flex-1 bg-white relative`}
        style={{
          height,
        }}
      >
        <canvas
          ref={canvasRef}
          className='w-full h-full absolute z-10'
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          style={{
            cursor: isDragging
              ? 'grabbing'
              : hoveredLegend !== null || hoveredIndex !== null
                ? 'pointer'
                : 'default',
          }}
        />
      </div>
      {/* <RiskFloatNav risk={risk} className='left-[50%] bottom-0' /> */}
      <MACDChart data={weekData} height={height} viewCount={viewCount} yTitle='WEEK MACD' />
    </section>
  )
}

export default Kline
