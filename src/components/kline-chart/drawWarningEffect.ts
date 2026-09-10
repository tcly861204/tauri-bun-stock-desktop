interface DrawOptions {
  ctx: CanvasRenderingContext2D
  padding: { top: number; left: number; right: number; bottom: number }
  chartWidth: number
  chartHeight: number
  riskPulse: number
}

export function drawNuclearWarning({
  ctx,
  padding,
  chartWidth,
  chartHeight,
  riskPulse,
}: DrawOptions) {
  const cx = padding.left + chartWidth / 2
  const cy = padding.top + chartHeight / 2
  const p = riskPulse

  ctx.save()

  // 1. 暗角 vignette
  const vigR = Math.max(chartWidth, chartHeight) * 0.7
  if (vigR > 0) {
    const vig = ctx.createRadialGradient(cx, cy, 0, cx, cy, vigR)
    vig.addColorStop(0, 'rgba(0,0,0,0)')
    vig.addColorStop(1, `rgba(40,0,0,${0.12 * p})`)
    ctx.fillStyle = vig
    ctx.fillRect(padding.left, padding.top, chartWidth, chartHeight)
  }

  // 2. 外层大气辉光
  const atm = ctx.createRadialGradient(cx, cy, 10, cx, cy, 140)
  atm.addColorStop(0, `rgba(255,50,0,${0.18 * p})`)
  atm.addColorStop(0.35, `rgba(200,20,0,${0.08 * p})`)
  atm.addColorStop(0.7, `rgba(120,0,0,${0.04 * p})`)
  atm.addColorStop(1, 'rgba(255,0,0,0)')
  ctx.fillStyle = atm
  ctx.beginPath()
  ctx.arc(cx, cy, 140, 0, Math.PI * 2)
  ctx.fill()

  // 3. 火球核心
  ctx.shadowColor = 'rgba(255,200,100,0.6)'
  ctx.shadowBlur = 35 * p
  ctx.beginPath()
  ctx.arc(cx, cy, 5 + 3 * Math.sin(p * Math.PI * 5), 0, Math.PI * 2)
  ctx.fillStyle = `rgba(255,255,255,${0.7 + 0.3 * p})`
  ctx.fill()

  ctx.beginPath()
  ctx.arc(cx, cy, 14 + 5 * Math.sin(p * Math.PI * 3.5), 0, Math.PI * 2)
  ctx.fillStyle = `rgba(255,220,50,${0.5 * p})`
  ctx.fill()

  ctx.beginPath()
  ctx.arc(cx, cy, 26 + 8 * Math.sin(p * Math.PI * 2.8), 0, Math.PI * 2)
  ctx.fillStyle = `rgba(255,80,0,${0.35 * p})`
  ctx.fill()

  ctx.beginPath()
  ctx.arc(cx, cy, 44 + 12 * Math.sin(p * Math.PI * 2.2), 0, Math.PI * 2)
  ctx.fillStyle = `rgba(160,10,0,${0.2 * p})`
  ctx.fill()
  ctx.shadowBlur = 0

  // 4. 冲击波环
  for (let ring = 0; ring < 2; ring++) {
    const phase = (p * 1.5 + ring * 0.35) % 1
    const r = 30 + 100 * phase
    const alpha = 0.25 * (1 - phase) * (1 - phase)
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255,200,100,${alpha})`
    ctx.lineWidth = 4 * (1 - phase)
    ctx.stroke()
  }

  // 5. 辐射裂纹
  const crackCount = 14
  for (let i = 0; i < crackCount; i++) {
    const angle = (i / crackCount) * Math.PI * 2 + p * 0.15
    const len = 30 + 60 * (0.4 + 0.6 * Math.sin(i * 1.7 + p * 3))
    ctx.beginPath()
    const segs = 4
    for (let s = 0; s <= segs; s++) {
      const t = s / segs
      const jitter = 10 * t * Math.sin(i * 2.3 + s * 2.7 + p * 2.5)
      const perpX = Math.cos(angle + Math.PI / 2)
      const perpY = Math.sin(angle + Math.PI / 2)
      const x = cx + Math.cos(angle) * len * t + perpX * jitter
      const y = cy + Math.sin(angle) * len * t + perpY * jitter
      s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.strokeStyle = `rgba(255,100,20,${0.12 * p})`
    ctx.lineWidth = 1.2
    ctx.stroke()
  }

  // 6. 上升余烬
  ctx.shadowColor = 'rgba(255,150,50,0.3)'
  ctx.shadowBlur = 6
  for (let i = 0; i < 28; i++) {
    const s = i * 0.618
    const circleAngle = s * 2 * Math.PI + p * 0.15
    const rise = (s + p * 0.25) % 1
    const dist = 10 + 100 * rise
    const driftX = Math.sin(s * 11 + p * 1.8) * 12 * rise
    const driftY = Math.cos(s * 7 + p * 2.3) * 6 * rise
    const px = cx + Math.cos(circleAngle) * dist + driftX
    const py2 = cy - 45 * rise + driftY
    const life = 1 - rise
    ctx.beginPath()
    ctx.arc(px, py2, 0.5 + 2.2 * life * p, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255,${Math.round(180 + 70 * life)},${Math.round(40 * life)},${0.5 * life * p})`
    ctx.fill()
  }
  ctx.shadowBlur = 0

  // 7. 警告三角
  const tri = 26
  ctx.shadowColor = `rgba(255,40,0,${0.5 * p})`
  ctx.shadowBlur = 18 * p
  ctx.beginPath()
  ctx.moveTo(cx, cy - tri)
  ctx.lineTo(cx - tri * 0.866, cy + tri * 0.5)
  ctx.lineTo(cx + tri * 0.866, cy + tri * 0.5)
  ctx.closePath()
  ctx.fillStyle = `rgba(200,25,0,${0.35 + 0.55 * p})`
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.strokeStyle = `rgba(255,220,50,${0.3 + 0.7 * p})`
  ctx.lineWidth = 2
  ctx.stroke()

  // 感叹号
  ctx.shadowColor = `rgba(255,220,50,${0.5 * p})`
  ctx.shadowBlur = 10 * p
  ctx.fillStyle = `rgba(255,255,255,${0.8 + 0.2 * p})`
  ctx.font = 'bold 24px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('!', cx, cy + 1)
  ctx.shadowBlur = 0

  // 8. 巨大风险 文字
  ctx.shadowColor = `rgba(255,0,0,${0.85 * p})`
  ctx.shadowBlur = 28 * p
  ctx.fillStyle = `rgba(255,80,80,${0.55 + 0.45 * p})`
  ctx.font = 'bold 20px Arial'
  ctx.fillText('巨 大 风 险', cx, cy + tri * 0.5 + 22)

  ctx.shadowBlur = 0
  ctx.restore()
}
