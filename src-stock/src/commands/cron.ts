import { Command } from 'commander'
import { printTitle } from '@/utils/format.ts'
import { handleUpdate } from './update'
import { handleScan } from '@/scan/index.ts'
const program = new Command()
export const handleCron = async (options: { task: string }) => {
  printTitle('🔄 Cron task')
  switch (options.task) {
    case 'default': // 默认任务
    case 'morning': // 上午 10:00 12:10 14:00
      // 更新股票数据
      await handleUpdate({ type: 'stock' })
      // 更新 ETF 数据
      await handleUpdate({ type: 'etf' })
      // 扫描股票
      await handleScan()
      break
    case 'evening': // 下午 14:30
      // 更新股票数据
      await handleUpdate({ type: 'stock' })
      // 更新 ETF 数据
      await handleUpdate({ type: 'etf' })
      // 扫描股票
      await handleScan()
      break
    case 'afternoon': // 下午 15:40
      break
  }
}

export default program
  .name('cron')
  .description('定时任务更新本地 K 线及埋点')
  .option('--task <task>', '定时任务类型节点')
  .action(handleCron)
