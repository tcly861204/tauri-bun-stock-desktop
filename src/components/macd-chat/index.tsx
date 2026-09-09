import { useEffect, useRef, useState, useMemo } from 'react'
import { calculateMACD } from '@/libs/calculate'

interface Props {
  viewCount?: number
  data: [string, string, string, string, string, string][]
  height?: number
  yTitle?: string
}

const MACDChart: React.FC<Props> = ({ data, height = 240, viewCount = 80, yTitle = 'MACD' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const macdData = useMemo(() => {
    if (data.length) {
      return calculateMACD(data).slice(0 - viewCount)
    }
    return []
  }, [data])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !macdData.length) return

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

    // 计算数据范围（包含 DIF/DEA 线）
    const allValues = macdData.flatMap((d) => [d.macd, d.macd_dif, d.macd_dea])
    const maxValue = Math.max(...allValues)
    const minValue = Math.min(...allValues)
    const valueRange = maxValue - minValue || 1
    const valueToY = (value: number) =>
      padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight
    const zeroY = valueToY(0)

    // 绘制Y轴刻度
    const ySteps = 5
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#999'
    for (let i = 0; i <= ySteps; i++) {
      const y = padding.top + (chartHeight / ySteps) * i
      const value = minValue + (i / ySteps) * valueRange

      // 绘制Y轴刻度线
      ctx.beginPath()
      ctx.strokeStyle = '#999'
      ctx.lineWidth = 1
      ctx.moveTo(padding.left - 5, y)
      ctx.lineTo(padding.left, y)
      ctx.stroke()
      ctx.fillText(value.toFixed(3), padding.left - 8, y)

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

    // 绘制零轴线
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

    // 计算柱子宽度
    const barWidth = Math.min((chartWidth / macdData.length) * 0.8, 1)
    const barSpacing = chartWidth / macdData.length

    // 绘制MACD柱状图和垂直网格线
    macdData.forEach((item, index) => {
      const x = padding.left + index * barSpacing + (barSpacing - barWidth) / 2
      const barHeight = Math.abs((item.macd / valueRange) * chartHeight)
      const y = item.macd >= 0 ? zeroY - barHeight : zeroY

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

      // 柱子颜色：正值红色，负值绿色
      const baseColor = item.macd > 0 ? '#f00' : '#36c361'
      ctx.fillStyle = hoveredIndex === index ? (item.macd > 0 ? '#cc0000' : '#2ea050') : baseColor
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
        ctx.fillText(item.time.slice(5), x + barWidth / 2, rect.height - padding.bottom + 10)
      }
    })

    // 绘制 DIF / DEA 折线（类似股票软件配色）
    const lineSeries = [
      { key: 'macd_dif' as const, color: '#f6b600', label: 'DIF' },
      { key: 'macd_dea' as const, color: '#1e90ff', label: 'DEA' },
    ]
    lineSeries.forEach(({ key, color }) => {
      ctx.beginPath()
      ctx.strokeStyle = color
      ctx.lineWidth = 1.2
      macdData.forEach((item, index) => {
        const x = padding.left + index * barSpacing + barSpacing / 2
        const y = valueToY(item[key])
        if (index === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
    })

    // 绘制左上角指标说明（MACD 参数 + 最新 DIF/DEA/MACD 值）
    const lastItem = macdData[macdData.length - 1]
    ctx.font = '10px Arial'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    const legendItems: (string | { text: string; color: string })[] = [
      'MACD(12,26,9)',
      { text: ` DIF: ${lastItem.macd_dif.toFixed(3)}`, color: '#f6b600' },
      { text: ` DEA: ${lastItem.macd_dea.toFixed(3)}`, color: '#1e90ff' },
      { text: ` MACD: ${lastItem.macd.toFixed(3)}`, color: '#333' },
    ]
    let legendX = padding.left
    legendItems.forEach((item) => {
      ctx.fillStyle = typeof item === 'string' ? '#333' : item.color
      ctx.fillText(typeof item === 'string' ? item : item.text, legendX, 5)
      legendX += ctx.measureText(typeof item === 'string' ? item : item.text).width
    })

    // 显示最后一个值的标签
    if (macdData.length > 0) {
      const lastItem = macdData[macdData.length - 1]
      const lastIndex = macdData.length - 1
      const x = padding.left + lastIndex * barSpacing + (barSpacing - barWidth) / 2
      const labelY =
        lastItem.macd >= 0
          ? zeroY - Math.abs((lastItem.macd / valueRange) * chartHeight) - 25
          : zeroY + Math.abs((lastItem.macd / valueRange) * chartHeight) + 15

      ctx.fillStyle = '#333'
      ctx.font = '12px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(lastItem.macd.toFixed(3), x + barWidth / 2, labelY)
    }

    // Y轴标题
    ctx.save()
    ctx.translate(10, rect.height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillStyle = '#999'
    ctx.font = '11px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(yTitle, 0, 0)
    ctx.restore()

    // 绘制工具提示
    if (hoveredIndex !== null && hoveredIndex < macdData.length) {
      const item = macdData[hoveredIndex]
      const tooltipText = `${item.time}: ${item.macd.toFixed(3)}`

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
  }, [macdData, height, hoveredIndex, mousePos])

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !macdData.length) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    setMousePos({ x, y })

    // 计算鼠标悬停的柱子
    const padding = { left: 50, right: 20 }
    const chartWidth = canvas.width - padding.left - padding.right
    const barSpacing = chartWidth / macdData.length

    let newHoveredIndex: number | null = null

    for (let i = 0; i < macdData.length; i++) {
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
      className='flex-1 bg-white'
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
  )
}

export default MACDChart
