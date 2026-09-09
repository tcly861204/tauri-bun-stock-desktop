import { calculateRSI } from '@/libs/calculate'
import { useEffect, useMemo, useRef, useState } from 'react'
import TurnoverChart from '../turnover-chart/index'

interface Props {
  viewCount?: number
  data: [string, string, string, string, string, string][]
  height?: number
}

const CanvasRSIChart: React.FC<Props> = ({ data, height = 240, viewCount = 80 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const RSI = useMemo(() => {
    return calculateRSI(data)
      .slice(0 - viewCount)
      .map(([time, rsi6, rsi12, rsi24, closePrice]: any) => {
        return {
          time,
          rsi6,
          rsi12,
          rsi24,
          closePrice,
        }
      })
  }, [data])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !RSI.length) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 设置画布尺寸，处理设备像素比
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvas.offsetWidth * dpr
    canvas.height = canvas.offsetHeight * dpr
    const rect = canvas.getBoundingClientRect()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, rect.width, rect.height)

    // 计算绘图区域
    const padding = { top: 20, right: 20, bottom: 30, left: 60 }
    const chartWidth = rect.width - padding.left - padding.right
    const chartHeight = rect.height - padding.top - padding.bottom

    // RSI范围通常是0-100
    const maxValue = 100
    const minValue = 0
    const valueRange = maxValue - minValue

    // 绘制Y轴刻度
    const yTickCount = 5
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#999'
    for (let i = 0; i <= yTickCount; i++) {
      const y = padding.top + (chartHeight / yTickCount) * i
      const value = maxValue - (valueRange / yTickCount) * i

      // 绘制Y轴刻度线
      ctx.beginPath()
      ctx.strokeStyle = '#999'
      ctx.lineWidth = 1
      ctx.moveTo(padding.left - 5, y)
      ctx.lineTo(padding.left, y)
      ctx.stroke()
      ctx.fillText(value.toFixed(0), padding.left - 8, y)

      // 添加水平网格线
      // ctx.beginPath()
      // ctx.strokeStyle = '#ccc'
      // ctx.lineWidth = 0.5
      // ctx.setLineDash([3, 3]) // 设置虚线样式
      // ctx.moveTo(padding.left, y)
      // ctx.lineTo(rect.width - padding.right, y)
      // ctx.stroke()
      // ctx.setLineDash([]) // 重置为实线
    }

    // 绘制RSI关键水平线（30和70）
    const drawHorizontalLine = (value: number, color: string, dash: number[] = []) => {
      const y = padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight
      ctx.strokeStyle = color
      ctx.lineWidth = 0.5
      ctx.setLineDash(dash)
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(padding.left + chartWidth, y)
      ctx.stroke()
      ctx.setLineDash([])

      // 标签
      ctx.fillStyle = color
      ctx.font = '10px Arial'
      ctx.textAlign = 'left'
      ctx.fillText(value.toString(), padding.left + 5, y - 2)
    }

    drawHorizontalLine(70, '#ff6b6b', [3, 3]) // 超买线
    drawHorizontalLine(30, '#4ecdc4', [3, 3]) // 超卖线
    drawHorizontalLine(50, '#ddd', [1, 1]) // 中线

    // 绘制RSI线条
    const drawRSILine = (rsiKey: 'rsi6' | 'rsi12' | 'rsi24', color: string) => {
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.beginPath()

      RSI.forEach((item, index) => {
        const x = padding.left + (index / (RSI.length - 1)) * chartWidth
        const y = padding.top + chartHeight - ((item[rsiKey] - minValue) / valueRange) * chartHeight

        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })

      ctx.stroke()
    }

    // 绘制三条RSI线
    drawRSILine('rsi6', '#ff0000') // 红色
    drawRSILine('rsi12', '#808080') // 灰色
    drawRSILine('rsi24', '#ffa500') // 橙色

    // 绘制数据点（用于交互）
    RSI.forEach((item, index) => {
      const x = padding.left + (index / (RSI.length - 1)) * chartWidth

      // 绘制RSI6的点（主要用于交互）
      const y6 = padding.top + chartHeight - ((item.rsi6 - minValue) / valueRange) * chartHeight

      if (hoveredIndex === index) {
        ctx.fillStyle = '#ff0000'
        ctx.beginPath()
        ctx.arc(x, y6, 3, 0, 2 * Math.PI)
        ctx.fill()
      }

      // 每隔几个点绘制垂直网格线
      if (index % 5 === 0) {
        ctx.beginPath()
        ctx.strokeStyle = '#ccc'
        ctx.lineWidth = 0.5
        ctx.setLineDash([3, 3]) // 设置虚线样式
        ctx.moveTo(x, padding.top)
        ctx.lineTo(x, rect.height - padding.bottom)
        ctx.stroke()
        ctx.setLineDash([]) // 重置为实线
      }
    })

    // X轴标签和刻度线（每5个显示一个）
    RSI.forEach((item, index) => {
      if (index % 5 === 0) {
        const x = padding.left + (index / (RSI.length - 1)) * chartWidth

        // 绘制X轴刻度线
        ctx.beginPath()
        ctx.strokeStyle = '#999'
        ctx.lineWidth = 1
        ctx.moveTo(x, rect.height - padding.bottom + 5)
        ctx.lineTo(x, rect.height - padding.bottom + 10)
        ctx.stroke()

        // 绘制X轴刻度文本
        ctx.fillStyle = '#999'
        ctx.font = '10px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(item.time.slice(5), x, rect.height - padding.bottom + 10)
      }
    })

    // 显示最后一个RSI6值的标签
    if (RSI.length > 0) {
      const lastItem = RSI[RSI.length - 1]
      const lastIndex = RSI.length - 1
      const x = padding.left + (lastIndex / (RSI.length - 1)) * chartWidth
      const y = padding.top + chartHeight - ((lastItem.rsi6 - minValue) / valueRange) * chartHeight

      ctx.fillStyle = '#ff0000'
      ctx.font = '10px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(lastItem.rsi6.toFixed(1), x - 20, y - 10)
    }

    // Y轴标题
    ctx.save()
    ctx.translate(15, rect.height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillStyle = '#999'
    ctx.font = '11px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('RSI', 0, 0)
    ctx.restore()

    // 图例
    const legendItems = [
      { label: 'RSI6', color: '#ff0000' },
      { label: 'RSI12', color: '#808080' },
      { label: 'RSI24', color: '#ffa500' },
    ]

    legendItems.forEach((item, index) => {
      const legendX = padding.left + index * 60
      const legendY = 15

      // 绘制线条
      ctx.strokeStyle = item.color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(legendX, legendY)
      ctx.lineTo(legendX + 15, legendY)
      ctx.stroke()

      // 绘制文字
      ctx.fillStyle = '#333'
      ctx.font = '10px Arial'
      ctx.textAlign = 'left'
      ctx.fillText(item.label, legendX + 20, legendY - 4)
    })

    // 绘制工具提示
    if (hoveredIndex !== null && hoveredIndex < RSI.length) {
      const item = RSI[hoveredIndex]
      const tooltipText = `${item.time}: RSI6=${item.rsi6.toFixed(1)}, RSI12=${item.rsi12.toFixed(1)}, RSI24=${item.rsi24.toFixed(1)}`

      ctx.font = '12px Arial'
      const textWidth = ctx.measureText(tooltipText).width
      const tooltipWidth = textWidth + 16
      const tooltipHeight = 24

      let tooltipX = mousePos.x + 10
      let tooltipY = mousePos.y - 30

      // 防止工具提示超出画布边界
      if (tooltipX + tooltipWidth > rect.width) tooltipX = mousePos.x - tooltipWidth - 10
      if (tooltipY < 0) tooltipY = mousePos.y + 20

      // 绘制工具提示背景
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight)

      // 绘制工具提示文字
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(tooltipText, tooltipX + 8, tooltipY + tooltipHeight / 2)
    }
  }, [RSI, height, hoveredIndex, mousePos])

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !RSI.length) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    setMousePos({ x, y })

    // 计算鼠标悬停的数据点
    const padding = { left: 50, right: 20 }
    const chartWidth = canvas.width - padding.left - padding.right

    let newHoveredIndex: number | null = null
    const tolerance = 10 // 鼠标容差范围

    for (let i = 0; i < RSI.length; i++) {
      const pointX = padding.left + (i / (RSI.length - 1)) * chartWidth
      if (Math.abs(x - pointX) < tolerance) {
        newHoveredIndex = i
        break
      }
    }

    setHoveredIndex(newHoveredIndex)
  }

  const handleMouseLeave = () => {
    setHoveredIndex(null)
  }

  return (
    <section className='relative flex gap-[1px] mb-[1px]'>
      <TurnoverChart data={data} height={height} viewCount={viewCount} />
      <div
        className='bg-white flex-1'
        style={{
          height: height + 'px',
        }}
      >
        <canvas
          ref={canvasRef}
          height={height}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            width: '100%',
            height: height + 'px',
            cursor: hoveredIndex !== null ? 'pointer' : 'default',
          }}
        />
      </div>
    </section>
  )
}

export default CanvasRSIChart
