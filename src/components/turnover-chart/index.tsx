import { useEffect, useRef, useState, useMemo } from 'react'
import { divide, round } from '@/libs/math'

interface Props {
  viewCount?: number
  data: [string, string, string, string, string, string][]
  height?: number
}

const CanvasBarChart: React.FC<Props> = ({
  data,
  height = 240,
  viewCount = 80
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const turnover = useMemo(() => {
    return data.slice(0 - viewCount).map((item) => {
      const [time, , , , , value] = item
      return {
        time,
        value: round(divide(Number(value), 10000), 2)
      }
    })
  }, [data])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !turnover.length) return

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

    // 计算数据范围
    const maxValue = Math.max(...turnover.map((d) => d.value))

    // 绘制Y轴刻度
    const yTickCount = 5
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#999'
    for (let i = 0; i <= yTickCount; i++) {
      const y = padding.top + (chartHeight / yTickCount) * i
      const value = maxValue - (maxValue / yTickCount) * i

      // 绘制Y轴刻度线
      ctx.beginPath()
      ctx.strokeStyle = '#999'
      ctx.lineWidth = 1
      ctx.moveTo(padding.left - 5, y)
      ctx.lineTo(padding.left, y)
      ctx.stroke()
      ctx.fillText(value.toFixed(2), padding.left - 8, y)

      // 添加水平网格线
      ctx.beginPath()
      ctx.strokeStyle = '#ccc'
      ctx.lineWidth = 0.5
      ctx.setLineDash([3, 3]) // 设置虚线样式
      ctx.moveTo(padding.left, y)
      ctx.lineTo(rect.width - padding.right, y)
      ctx.stroke()
      ctx.setLineDash([]) // 重置为实线
    }

    // 计算柱子宽度
    const barWidth = Math.min((chartWidth / turnover.length) * 0.8, 3)
    const barSpacing = chartWidth / turnover.length

    // 绘制柱状图和垂直网格线
    turnover.forEach((item, index) => {
      const x = padding.left + index * barSpacing + (barSpacing - barWidth) / 2
      const barHeight = (item.value / maxValue) * chartHeight
      const y = padding.top + chartHeight - barHeight

      // 每隔几个柱子绘制垂直网格线
      if (index % 5 === 0) {
        ctx.beginPath()
        ctx.strokeStyle = '#ccc'
        ctx.lineWidth = 0.5
        ctx.setLineDash([3, 3]) // 设置虚线样式
        ctx.moveTo(x + barWidth / 2, padding.top)
        ctx.lineTo(x + barWidth / 2, rect.height - padding.bottom)
        ctx.stroke()
        ctx.setLineDash([]) // 重置为实线
      }

      // 柱子颜色
      ctx.fillStyle = hoveredIndex === index ? '#2E7BD6' : '#4A90E2'
      ctx.fillRect(x, y, barWidth, barHeight)

      // X轴标签和刻度线（每5个显示一个）
      if (index % 5 === 0) {
        // 绘制X轴刻度线
        ctx.beginPath()
        ctx.strokeStyle = '#999'
        ctx.lineWidth = 1
        ctx.moveTo(x + barWidth / 2, rect.height - padding.bottom + 5)
        ctx.lineTo(x + barWidth / 2, rect.height - padding.bottom + 10)
        ctx.stroke()

        // 绘制X轴刻度文本
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillStyle = '#999'
        ctx.fillText(
          item.time.slice(5),
          x + barWidth / 2,
          rect.height - padding.bottom + 10
        )
      }
    })

    // Y轴标题
    ctx.save()
    ctx.translate(10, rect.height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillStyle = '#999'
    ctx.font = '11px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('TURNOVER', 0, 0)
    ctx.restore()

    // 绘制工具提示
    if (hoveredIndex !== null && hoveredIndex < turnover.length) {
      const item = turnover[hoveredIndex]
      const tooltipText = `${item.time}: ${item.value.toFixed(2)}`

      ctx.font = '12px Arial'
      const textWidth = ctx.measureText(tooltipText).width
      const tooltipWidth = textWidth + 16
      const tooltipHeight = 24

      let tooltipX = mousePos.x + 10
      let tooltipY = mousePos.y - 30

      // 防止工具提示超出画布边界
      if (tooltipX + tooltipWidth > rect.width)
        tooltipX = mousePos.x - tooltipWidth - 10
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
  }, [turnover, height, hoveredIndex, mousePos])

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !turnover.length) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    setMousePos({ x, y })

    // 计算鼠标悬停的柱子
    const padding = { left: 50, right: 20 }
    const chartWidth = canvas.width - padding.left - padding.right
    const barSpacing = chartWidth / turnover.length

    let newHoveredIndex: number | null = null

    for (let i = 0; i < turnover.length; i++) {
      const barX = padding.left + i * barSpacing
      if (x >= barX && x <= barX + barSpacing) {
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
    <div
      className="flex-1 bg-white"
      style={{
        height: height + 'px'
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
          cursor: hoveredIndex !== null ? 'pointer' : 'default'
        }}
      />
    </div>
  )
}

export default CanvasBarChart
