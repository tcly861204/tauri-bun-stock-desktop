import { Command } from 'commander'
import { printTitle } from '@/utils/format.ts'
import { queryStocks } from '@/utils/db.ts'
import { scanWithWorkers } from './withWorker.ts'
import { CONFIG } from '@/utils/const.ts'
import { sleep } from 'bun'
import { partternTable, writeDB } from './write.ts'
const program = new Command()
export const handleScan = async (options?: { rebackNum: number }) => {
  printTitle('\n📊 开始扫描均线多头小阳线(MA5>MA10>MA20, 收阳, 涨幅≤1%)...')
  const stocks = await queryStocks()
  const results = await scanWithWorkers(stocks, CONFIG.DATA_DIR, options?.rebackNum || 0)
  console.log(`\n  ✅ 共 ${results.length} 只股票符合条件`)
  while (partternTable.length > 0) {
    const tableName = partternTable.shift()!
    writeDB(
      tableName,
      results.filter((r) => r.pattern.includes(tableName))
    )
    await sleep(100)
  }
}
export default program
  .name('scan')
  .description('🌱 多模型扫描')
  .option('--rebackNum <number>', '回测天数', Number, 0)
  .action(handleScan)
