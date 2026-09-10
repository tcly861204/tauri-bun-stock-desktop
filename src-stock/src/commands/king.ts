import { Command } from 'commander'
import { printTitle, logError, logSuccess } from '@/utils/format.ts'
import { getRecentDays } from '@/utils/util'
import { select as inqSelect } from '@inquirer/prompts'
import { getHistoryTopicRise } from '@/utils/api.ts'
import { insertStockTops } from '@/utils/db.ts'

const program = new Command()
export const handleKing = async () => {
  printTitle('Top 涨幅榜')
  // 生成最近15个交易日
  const dates: string[] = await getRecentDays(15)
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const date = await inqSelect({
    message: '请选择日期',
    loop: false,
    choices: dates.map((d) => {
      const dt = new Date(d)
      return { name: `${d} (星期${weekdays[dt.getDay()]})`, value: d }
    }),
  })
  const formattedDate = date.replace(/-/g, '')
  try {
    console.log(`  ⏳ 正在获取 ${date} 的涨停数据...`)
    const data: any = await getHistoryTopicRise(formattedDate)
    console.log(`  ✅ 数据获取完成`)

    if (!data || !data.pool) {
      logError('该日期没有数据')
      return
    }
    // 导出首板数据
    const topLines = data.pool
      .filter((item: any) => {
        if (!(item.zttj?.days === 1 && item.zttj?.ct === 1)) return false
        if (['3', '4', '8', '9'].some((p) => item.c.startsWith(p)) || item.c.startsWith('688'))
          return false
        return true
      })
      .map((item: any) => {
        return {
          code: item.c,
          type: item.m,
          name: item.n,
        }
      })
    await insertStockTops(date, topLines)
    logSuccess(`首板数据已更新 (${topLines.length} 条)`)
  } catch (e: any) {
    logError(`获取数据失败: ${e.message}`)
  }
}
export default program.name('king').description('📈 Top 涨幅榜').action(handleKing)
