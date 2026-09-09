import { queryStocks } from './db'
import { logError, ProgressBar } from './log'
import { getBatchRealtimeQuotes } from './api'
import { CONFIG } from './const'
import { join } from 'node:path'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

function formatDate(date: string): string {
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
}

function formatNum(num: string): string {
  const [int, frac] = num.split('.')
  return `${int}.${(frac ?? '000').padEnd(3, '0')}`
}

export const updateStocks = async () => {
  const stockList = await queryStocks()
  if (stockList.length === 0) {
    logError('stock.db 中没有股票数据')
    return
  }
  const BATCH_SIZE = 200
  const pb = new ProgressBar(stockList.length, '准备更新...')
  let updatedCount = 0
  let newCount = 0
  let errorCount = 0
  for (let start = 0; start < stockList.length; start += BATCH_SIZE) {
    const batch = stockList.slice(start, start + BATCH_SIZE)

    // 1. 批量获取这一批的实时行情
    const symbols = batch.map((s) => `${s.type === 0 ? 'sz' : 'sh'}${s.code}`)
    const quoteLines: string[] = await getBatchRealtimeQuotes(symbols)

    // 2. 解析行情，建立 code -> { date, value[] } 映射
    const quoteMap = new Map<string, { date: string; value: string[]; info: string[] }>()
    for (const line of quoteLines) {
      const parts =
        line.split('=').length > 1 ? line.split('=')[1]!.replace(/\"/g, '').split('~') : []
      if (parts.length > 35) {
        try {
          const code = parts[2]!
          const time = formatDate(parts[30]!.slice(0, 8))
          quoteMap.set(code, {
            date: time,
            value: [
              time,
              formatNum(parts[5]!), // open
              formatNum(parts[3]!), // close
              formatNum(parts[41]!), // high
              formatNum(parts[42]!), // low
              formatNum(parts[6]!), // vol
            ],
            info: parts,
          })
        } catch (_) {}
      }
    }

    // 3. 并发更新本地 K 线文件（各股票独立操作互不冲突）
    const results = await Promise.allSettled(
      batch.map(async ({ type, code, name }) => {
        const prefix = type === 0 ? 'sz' : 'sh'
        const symbolKey = `${prefix}${code}`
        const filePath = join(CONFIG.DATA_DIR, `${code}.json`)
        const quote = quoteMap.get(code)

        if (!quote) return 'error'

        if (!existsSync(filePath)) {
          pb.println(`  ⚠️ ${code} ${name} - 本地文件不存在`)
          return 'error'
        }

        try {
          const localJsonStr = readFileSync(filePath, 'utf-8')
          const root = JSON.parse(localJsonStr)
          const data = root?.data?.[symbolKey]

          if (!data) {
            pb.println(`  ⚠️ ${code} ${name} - 未找到 ${symbolKey} 数据`)
            return 'error'
          }

          const { info } = quote
          data.qt[symbolKey] = info

          const klineArr: any[] | undefined = data.qfqday ?? data.day
          if (!klineArr || !Array.isArray(klineArr) || klineArr.length === 0) {
            pb.println(`  ⚠️ ${code} ${name} - K 线数据为空`)
            return 'error'
          }

          const lastIdx = klineArr.length - 1
          if (klineArr[lastIdx][0] === quote.date) {
            klineArr[lastIdx] = quote.value
          } else {
            klineArr.push(quote.value)
          }
          writeFileSync(filePath, JSON.stringify(root, null, 2))
          return klineArr[lastIdx][0] === quote.date ? 'updated' : 'new'
        } catch (_) {
          pb.println(`  ❌ ${code} ${name} - 更新失败`)
          return 'error'
        }
      })
    )

    for (const r of results) {
      if (r.status === 'fulfilled') {
        if (r.value === 'updated') updatedCount++
        else if (r.value === 'new') newCount++
        else errorCount++
      } else {
        errorCount++
      }
      pb.inc(1)
    }
  }

  pb.finish('更新完成')
  console.log(
    `\n  总处理: ${stockList.length} | 更新: ${updatedCount} | 新增: ${newCount} | 失败/跳过: ${errorCount}`
  )
}
