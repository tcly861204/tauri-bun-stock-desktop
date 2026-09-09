interface DrawOptions {
  ctx: CanvasRenderingContext2D
  padding: { top: number; left: number; right: number; bottom: number }
  chartWidth: number
  chartHeight: number
  pulse: number
}

export function drawBuySignal({ ctx, padding, chartWidth, chartHeight, pulse }: DrawOptions) {
  const cx = padding.left + chartWidth / 2
  const cy = padding.top + chartHeight / 2
  const p = pulse

  ctx.save()

  // 1. 暗角 (green tint)
  const vigR = Math.max(chartWidth, chartHeight) * 0.7
  const vig = ctx.createRadialGradient(cx, cy, 0, cx, cy, vigR)
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(1, `rgba(0,30,0,${0.1 * p})`)
  ctx.fillStyle = vig
  ctx.fillRect(padding.left, padding.top, chartWidth, chartHeight)

  // 2. 外发光 (green/gold)
  const atm = ctx.createRadialGradient(cx, cy, 10, cx, cy, 130)
  atm.addColorStop(0, `rgba(50,255,100,${0.15 * p})`)
  atm.addColorStop(0.4, `rgba(0,200,60,${0.07 * p})`)
  atm.addColorStop(0.8, `rgba(0,100,0,${0.03 * p})`)
  atm.addColorStop(1, 'rgba(0,255,0,0)')
  ctx.fillStyle = atm
  ctx.beginPath()
  ctx.arc(cx, cy, 130, 0, Math.PI * 2)
  ctx.fill()

  // 3. 核心 (golden/green sun)
  ctx.shadowColor = 'rgba(100,255,100,0.5)'
  ctx.shadowBlur = 30 * p
  ctx.beginPath()
  ctx.arc(cx, cy, 4 + 3 * Math.sin(p * Math.PI * 4), 0, Math.PI * 2)
  ctx.fillStyle = `rgba(255,255,200,${0.7 + 0.3 * p})`
  ctx.fill()

  ctx.beginPath()
  ctx.arc(cx, cy, 12 + 5 * Math.sin(p * Math.PI * 3), 0, Math.PI * 2)
  ctx.fillStyle = `rgba(180,255,50,${0.5 * p})`
  ctx.fill()

  ctx.beginPath()
  ctx.arc(cx, cy, 22 + 8 * Math.sin(p * Math.PI * 2.5), 0, Math.PI * 2)
  ctx.fillStyle = `rgba(50,200,0,${0.3 * p})`
  ctx.fill()

  ctx.beginPath()
  ctx.arc(cx, cy, 38 + 12 * Math.sin(p * Math.PI * 2), 0, Math.PI * 2)
  ctx.fillStyle = `rgba(0,80,0,${0.15 * p})`
  ctx.fill()
  ctx.shadowBlur = 0

  // 4. 脉冲环
  for (let ring = 0; ring < 2; ring++) {
    const phase = (p * 1.5 + ring * 0.35) % 1
    const r = 25 + 90 * phase
    const alpha = 0.2 * (1 - phase) * (1 - phase)
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(100,255,100,${alpha})`
    ctx.lineWidth = 3 * (1 - phase)
    ctx.stroke()
  }

  // 5. 上升粒子
  ctx.shadowColor = 'rgba(100,255,100,0.3)'
  ctx.shadowBlur = 5
  for (let i = 0; i < 20; i++) {
    const s = i * 0.618
    const rise = (s + p * 0.2) % 1
    const dist = 10 + 70 * rise
    const a = s * 2 * Math.PI + p * 0.1
    const dx = Math.sin(s * 9 + p * 1.5) * 10 * rise
    const dy = Math.cos(s * 6 + p * 2) * 5 * rise
    const px = cx + Math.cos(a) * dist + dx
    const py = cy - 40 * rise + dy
    const life = 1 - rise
    ctx.beginPath()
    ctx.arc(px, py, 0.5 + 1.8 * life * p, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(80,255,${Math.round(80 + 175 * life)},${0.35 * life * p})`
    ctx.fill()
  }
  ctx.shadowBlur = 0

  // 6. 向上箭头
  const as = 22
  ctx.shadowColor = `rgba(0,255,80,${0.5 * p})`
  ctx.shadowBlur = 16 * p
  ctx.beginPath()
  ctx.moveTo(cx, cy - as)
  ctx.lineTo(cx - as * 0.55, cy + as * 0.3)
  ctx.lineTo(cx + as * 0.55, cy + as * 0.3)
  ctx.closePath()
  ctx.fillStyle = `rgba(0,200,80,${0.4 + 0.5 * p})`
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.strokeStyle = `rgba(100,255,150,${0.3 + 0.7 * p})`
  ctx.lineWidth = 2
  ctx.stroke()

  // 7. 文字: 买入信号
  ctx.shadowColor = `rgba(0,255,50,${0.7 * p})`
  ctx.shadowBlur = 24 * p
  ctx.fillStyle = `rgba(50,255,100,${0.5 + 0.4 * p})`
  ctx.font = 'bold 18px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('买 入 信 号', cx, cy + as * 0.5 + 18)

  ctx.shadowBlur = 0
  ctx.restore()
}
