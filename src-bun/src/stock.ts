import { os } from '@orpc/server'
import * as z from 'zod'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CONFIG } from './const'

/** 批量获取腾讯实时行情 API — GBK → UTF-8 解码 */
export async function getBatchRealtimeQuotes(codes: string[]): Promise<string[]> {
  const url = `http://qt.gtimg.cn/q=${codes.join(',')}`
  const resp = await fetch(url)
  const buf = await resp.arrayBuffer()
  // @ts-ignore
  return new TextDecoder('gbk').decode(buf).split('\n')
}

export function hasStockHidden(code: string, name: string) {
  if (code.startsWith('9') || code.startsWith('3') || code.startsWith('688')) return 1
  if (name.includes('*') || name.includes('退') || name.includes('ST')) return 1
  return 0
}

export const getStockkline = os
  .input(z.object({ code: z.string(), type: z.string() }))
  .output(z.string())
  .handler(async ({ input }) => {
    const { code, type } = input
    const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${code},${type},,,${type === 'day' ? 420 : 80},qfq`
    const res = await fetch(url)
    const data = await res.json()
    const text = JSON.stringify(data)
    const stockCode = code.slice(2)
    if (stockCode.startsWith('1') || stockCode.startsWith('5')) {
      writeFileSync(join(CONFIG.DATA_ETF_DIR, `${stockCode}.json`), text, 'utf-8')
    } else {
      writeFileSync(join(CONFIG.DATA_DIR, `${stockCode}.json`), text, 'utf-8')
    }
    return text
  })

export const getStockRealtime = os
  .input(z.object({ code: z.string() }))
  .output(z.string())
  .handler(async ({ input }) => {
    const { code } = input
    const resp = await fetch(`https://qt.gtimg.cn/q=${code}`)
    const buffer = await resp.arrayBuffer()
    // @ts-ignore
    const decoder = new TextDecoder('gbk')
    const text = decoder.decode(buffer)
    return text
  })
export const getHeatmapData = os.output(z.any()).handler(async () => {
  type SectorStock = {
    sector_code: string
    sector_name: string
    sub_sector_name: string
    type: number
    code: string
  }
  const SECTOR_PATH_JSON = 'D:\\soft\\stock-app-local-data\\database\\sector.json'
  const localJson = JSON.parse(readFileSync(SECTOR_PATH_JSON, 'utf-8')) as SectorStock[]
  const prefixed = localJson.map(
    (s) => `${s.type === 1 ? 'sh' : s.type === 0 ? 'sz' : 'bj'}${s.code}`
  )
  const items: {
    type: number
    code: string
    name: string
    sectorCode: string
    sectorName: string
    subSectorName: string
    price: number
    hidden: number
    change: number | null
    mcap: number
  }[] = []
  for (let i = 0; i < prefixed.length; i += 200) {
    const batch = prefixed.slice(i, i + 200)
    const lines = await getBatchRealtimeQuotes(batch)
    const batchStocks = localJson.slice(i, i + 200)
    for (let j = 0; j < batch.length; j++) {
      const line = lines[j]
      if (!line) continue
      const eq = line.indexOf('=')
      if (eq === -1) continue
      const f = line
        .slice(eq + 1)
        .replace(/^"|";?$/g, '')
        .split('~')
      const pct = parseFloat(f[32]!)
      const price = parseFloat(f[3]!)
      const mcap = parseFloat(f[44] ?? '0') || 0
      const name = f[1]!
      const s = batchStocks[j]
      items.push({
        type: s!.type,
        code: s!.code,
        name,
        hidden: hasStockHidden(s!.code, name),
        sectorCode: s!.sector_code,
        sectorName: s!.sector_name,
        subSectorName: s!.sub_sector_name,
        price: isNaN(price) ? 0 : price,
        change: isNaN(pct) ? null : pct,
        mcap,
      })
    }
  }
  return items
})
