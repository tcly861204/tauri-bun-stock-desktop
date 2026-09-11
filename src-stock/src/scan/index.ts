import { Command } from 'commander'
import { printTitle } from '@/utils/format.ts'
import { queryStocks } from '@/utils/db.ts'
import { scanWithWorkers } from './withWorker.ts'
import { CONFIG } from '@/utils/const.ts'

const program = new Command()
export const handleScan = async (options?: { rebackNum: number }) => {
  printTitle('\n📊 开始扫描均线多头小阳线(MA5>MA10>MA20, 收阳, 涨幅≤1%)...')
  const stocks = await queryStocks()
  const results = await scanWithWorkers(stocks, CONFIG.DATA_DIR, options?.rebackNum || 0)
  console.log(`\n  ✅ 共 ${results.length} 只股票符合条件`)
}
export default program
  .name('scan')
  .description('🌱 均线多头小阳线(MA5>MA10>MA20, 收阳, 涨幅≤1%)')
  .option('--rebackNum <number>', '回测天数', Number, 0)
  .action(handleScan)
