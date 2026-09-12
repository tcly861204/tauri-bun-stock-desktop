import { getDb } from '@/utils/db.ts'
import { getRecentDays } from '@/utils/util'
import { partternTable } from '@/utils/const.ts'
import { sleep } from 'bun'
export const cleanData = async () => {
  const db = getDb()
  const dates = await getRecentDays(30)
  while (partternTable.length > 0) {
    const tableName = partternTable.shift()!
    // 删除30天以后的数据， 保留30天内的数据
    db.run(`DELETE FROM ${tableName} WHERE date NOT IN (${dates.map((d) => `'${d}'`).join(',')})`)
    await sleep(100)
  }
}
