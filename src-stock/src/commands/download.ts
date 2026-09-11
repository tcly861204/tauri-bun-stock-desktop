import { Command } from 'commander'
import { select } from '@inquirer/prompts'
import { printTitle, logError, logInfo, ProgressBar } from '@/utils/format.ts'
import { CONFIG } from '@/utils/const'
import { queryStockETFs, queryStocks } from '@/utils/db'
import { downloadKlineFromTencent } from '@/utils/api'
import { throttledWait } from '@/utils/util'
import { join } from 'node:path'
import { writeFileSync } from 'node:fs'
import { ensureDir } from '@/utils/file'

const program = new Command()
export const handleDownload = async (options?: { type: string }) => {
  printTitle('⬇️  Download stock data')
  let choice = ''
  if (options && options.type) {
    choice = options.type
  } else {
    choice = await select({
      message: '请选择下载类型',
      choices: [
        { name: '📈 Stock', value: 'stock' },
        { name: '📊 ETF', value: 'etf' },
      ],
    })
  }
  if (choice === 'stock') {
    await onHandleDownload(true)
  } else {
    await onHandleDownload(false)
  }
}

async function onHandleDownload(isStock: boolean) {
  const stockList = isStock ? await queryStocks() : await queryStockETFs()
  if (stockList.length === 0) {
    logError('没有 Stock 数据')
    return
  }
  const stockDir = isStock ? CONFIG.DATA_DIR : CONFIG.DATA_ETF_DIR
  ensureDir(stockDir)
  logInfo(`Stock 数据将保存到: ${stockDir}`)

  const total = stockList.length
  const pb = new ProgressBar(total, '准备下载 Stock...')

  for (let i = 0; i < total; i++) {
    const stock = stockList[i]!
    const code = stock.code
    const name = stock.name
    const prefix = stock.type === 1 ? 'sh' : 'sz'
    pb.setMessage(`[${i + 1}] ${code} ${name}`)
    try {
      const filePath = join(stockDir, `${code}.json`)
      const jsonText = await downloadKlineFromTencent(prefix, code)
      writeFileSync(filePath, jsonText, 'utf-8')
      pb.println(`  ✅ [${i + 1}/${total}] ${code} ${name} - 已保存`)
    } catch (e: any) {
      pb.println(`  ❌ [${i + 1}/${total}] ${code} ${name} - 下载失败: ${e.message}`)
    }
    pb.inc(1)
    await throttledWait(i, total, pb)
  }
  pb.finish(`Stock 下载完成，所有数据已保存到 ${stockDir}`)
}

export default program
  .name('download')
  .description('下载股票K线')
  .option('--type <type>', '下载类型')
  .action(handleDownload)
