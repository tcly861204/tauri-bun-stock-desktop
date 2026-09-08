import { os } from '@orpc/server'
import * as z from 'zod'

export const getStockkline = os
  .input(z.object({ code: z.string(), type: z.string() }))
  .output(z.string())
  .handler(async ({ input }) => {
    const { code, type } = input
    const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${code},${type},,,${type === 'day' ? 420 : 80},qfq`
    const res = await fetch(url)
    const data = await res.json()
    return JSON.stringify(data)
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
