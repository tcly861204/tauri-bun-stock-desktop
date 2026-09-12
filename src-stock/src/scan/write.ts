import { logSuccess } from '@/utils/format.ts'
import { getDb } from '@/utils/db.ts'
import { type ScanResult } from './type.ts'
export function writeDB(tableName: string, results: ScanResult[]) {
  const db = getDb()
  db.run(`DELETE FROM ${tableName} WHERE date='${results[0]!.lastDate}'`)
  let insert: any
  switch (tableName) {
    case 'up_small_gain':
    case 'consecutive_rise':
    case 'long_shadow':
    case 'ma5_reversal_cross':
    case 'one_word_up':
      insert = db.prepare(`INSERT INTO ${tableName} (code, name, date) VALUES (?1, ?2, ?3)`)
      db.transaction(() => {
        for (const r of results) {
          insert.run(r.code, r.name, r.lastDate)
        }
      })()
      break
    case 'buy_signal':
      insert = db.prepare(
        `INSERT INTO ${tableName} (code, name, date, is_etf) VALUES (?1, ?2, ?3, ?4)`
      )
      db.transaction(() => {
        for (const r of results) {
          insert.run(r.code, r.name, r.lastDate, 0)
        }
      })()
      break
    case 'volume_surge':
      insert = db.prepare(
        `INSERT INTO ${tableName} (type, code, name, date) VALUES (?1, ?2, ?3, ?4)`
      )
      db.transaction(() => {
        for (const r of results) {
          insert.run(r.type, r.code, r.name, r.lastDate)
        }
      })()
      break
  }
  logSuccess(`已写入${tableName}数据库 ${results.length} 条`)
}
