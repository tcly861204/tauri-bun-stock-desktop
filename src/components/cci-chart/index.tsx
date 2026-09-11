import { useEffect, useMemo, useRef, useState } from 'react'
import { calculateCCI, findLowestPoints } from '@/libs/calculate'
import MACDChart from '../macd-chat'

interface Props {
  viewCount?: number
  data: [string, string, string, string, string, string][]
  height?: number
}

const CanvasCCIChart: React.FC<Props> = ({ data, height = 240, viewCount = 80 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const cci = useMemo(() => {
    const trend = calculateCCI(data).slice(0 - viewCount)
    const lows = findLowestPoints(trend).slice(0 - viewCount)
    return {
      trend,
      lows: lows.map((item) => item.time),
    }
  }, [data])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !cci.trend.length) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 设置画布尺寸
    const width = canvas.offsetWidth
    canvas.width = width
    canvas.height = height

    // 清空画布
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    // 计算绘图区域
    const padding = { top: 30, right: 10, bottom: 30, left: 60 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    // 计算数据范围
    const maxValue = Math.max(...cci.trend.map((d) => d.value))
    const minValue = Math.min(...cci.trend.map((d) => d.value))
    const valueRange = maxValue - minValue
    const zeroY = padding.top + chartHeight - ((0 - minValue) / valueRange) * chartHeight

    // 绘制Y轴刻度
    const yTickCount = 5
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#999'
    for (let i = 0; i <= yTickCount; i++) {
      const y = padding.top + (chartHeight / yTickCount) * i
      const value = maxValue - (valueRange / yTickCount) * i
      ctx.beginPath()
      ctx.strokeStyle = '#999'
      ctx.lineWidth = 1 // 确保刻度线宽为1px
      ctx.moveTo(padding.left - 5, y)
      ctx.lineTo(padding.left, y)
      ctx.stroke()
      ctx.fillText(value.toFixed(1), padding.left - 8, y)

      // 添加水平网格线
      // ctx.beginPath()
      // ctx.strokeStyle = '#ccc'
      // ctx.lineWidth = 0.5
      // ctx.setLineDash([3, 3]) // 设置虚线样式
      // ctx.moveTo(padding.left, y)
      // ctx.lineTo(width - padding.right, y)
      // ctx.stroke()
      // ctx.setLineDash([]) // 重置为实线
    }

    // 绘制零轴线（如果数据包含正负值）
    if (minValue < 0 && maxValue > 0) {
      ctx.strokeStyle = '#999'
      ctx.lineWidth = 0.5
      ctx.setLineDash([2, 4])
      ctx.beginPath()
      ctx.moveTo(padding.left, zeroY)
      ctx.lineTo(padding.left + chartWidth, zeroY)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // 绘制CCI关键水平线（+100和-100）
    const drawHorizontalLine = (value: number, color: string, dash: number[] = []) => {
      if (value >= minValue && value <= maxValue) {
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
    }

    drawHorizontalLine(100, '#ff6b6b', [3, 3]) // 超买线
    drawHorizontalLine(-100, '#4ecdc4', [3, 3]) // 超卖线

    // 绘制CCI线条
    ctx.strokeStyle = '#ff0000'
    ctx.lineWidth = 1.5
    ctx.beginPath()

    cci.trend.forEach((item, index) => {
      const x = padding.left + (index / (cci.trend.length - 1)) * chartWidth
      const y = padding.top + chartHeight - ((item.value - minValue) / valueRange) * chartHeight

      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()

    // 绘制数据点和标签
    cci.trend.forEach((item, index) => {
      const x = padding.left + (index / (cci.trend.length - 1)) * chartWidth
      const y = padding.top + chartHeight - ((item.value - minValue) / valueRange) * chartHeight

      // 高亮悬停点
      if (hoveredIndex === index) {
        ctx.fillStyle = '#ff0000'
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, 2 * Math.PI)
        ctx.fill()
      }

      // 显示最低点和最后一个点的标签
      if (cci.lows.includes(item.time) || index === cci.trend.length - 1) {
        ctx.fillStyle = '#ff0000'
        ctx.font = '12px Arial'
        ctx.textAlign = 'center'

        // 标签位置调整
        const labelY = y + 15
        ctx.fillText(item.value.toFixed(1), x, labelY)

        // 绘制标记点
        ctx.fillStyle = '#ff0000'
        ctx.beginPath()
        ctx.arc(x, y, 2, 0, 2 * Math.PI)
        ctx.fill()
      }
    })

    // X轴标签（每5个显示一个）
    cci.trend.forEach((item, index) => {
      if (index % 5 === 0) {
        const x = padding.left + (index / (cci.trend.length - 1)) * chartWidth

        // 绘制垂直网格线
        ctx.beginPath()
        ctx.strokeStyle = '#ccc'
        ctx.lineWidth = 0.5
        ctx.setLineDash([3, 3]) // 设置虚线样式
        ctx.moveTo(x, padding.top)
        ctx.lineTo(x, padding.top + chartHeight)
        ctx.stroke()
        ctx.setLineDash([]) // 重置为实线

        // 绘制X轴刻度线
        ctx.beginPath()
        ctx.strokeStyle = '#999'
        ctx.lineWidth = 1
        ctx.moveTo(x, height - padding.bottom + 5)
        ctx.lineTo(x, height - padding.bottom + 10)
        ctx.stroke()

        // X轴标签
        ctx.fillStyle = '#999'
        ctx.font = '10px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(item.time.slice(5), x, height - padding.bottom + 10)
      }
    })

    // 绘制图例
    const legendItems = [
      { name: 'CCI', color: '#ff0000' },
      { name: '+100', color: '#ff6b6b' },
      { name: '-100', color: '#4ecdc4' },
    ]

    let legendX = padding.left
    const legendY = padding.top - 10

    legendItems.forEach((item) => {
      // 绘制图例颜色块
      ctx.fillStyle = item.color
      ctx.fillRect(legendX, legendY - 5, 15, 2)

      // 绘制图例文字
      ctx.fillStyle = '#333'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(item.name, legendX + 20, legendY - 4)

      // 更新下一个图例的位置
      legendX += 70
    })

    // Y轴标题
    ctx.save()
    ctx.translate(10, height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillStyle = '#999'
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('CCI', 0, 0)
    ctx.restore()

    // 绘制工具提示
    if (hoveredIndex !== null && hoveredIndex < cci.trend.length) {
      const item = cci.trend[hoveredIndex]
      const tooltipText = `${item.time}: ${item.value.toFixed(1)}`

      ctx.font = '12px Arial'
      const textWidth = ctx.measureText(tooltipText).width
      const tooltipWidth = textWidth + 16
      const tooltipHeight = 24

      let tooltipX = mousePos.x + 10
      let tooltipY = mousePos.y - 30

      // 防止工具提示超出画布边界
      if (tooltipX + tooltipWidth > width) tooltipX = mousePos.x - tooltipWidth - 10
      if (tooltipY < 0) tooltipY = mousePos.y + 20

      // 绘制工具提示背景
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight)

      // 绘制工具提示文字
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.fillText(tooltipText, tooltipX + tooltipWidth / 2, tooltipY + 16)
    }
  }, [cci, height, hoveredIndex, mousePos])

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !cci.trend.length) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    setMousePos({ x, y })

    // 计算鼠标悬停的数据点
    const padding = { left: 50, right: 20 }
    const chartWidth = canvas.width - padding.left - padding.right

    let newHoveredIndex: number | null = null
    const tolerance = 10 // 鼠标容差范围

    for (let i = 0; i < cci.trend.length; i++) {
      const pointX = padding.left + (i / (cci.trend.length - 1)) * chartWidth
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
    <section className='relative flex gap-[1px] rounded-b-md overflow-hidden'>
      <MACDChart data={data} height={height} viewCount={viewCount} />
      <div
        className='bg-white flex-1'
        style={{
          height,
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

export default CanvasCCIChart
