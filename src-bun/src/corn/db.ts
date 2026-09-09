import { Database } from 'bun:sqlite'
import { CONFIG } from './const'
let _db: Database | null = null
const DATA_BASE_FILE = CONFIG.DATA_BASE_FILE
export function getDb(): Database {
  if (!_db) {
    _db = new Database(DATA_BASE_FILE)
    _db.run('PRAGMA journal_mode=WAL')
    _db.run('PRAGMA busy_timeout=5000')
  }
  return _db
}

/** 查询所有股票数据 */
export async function queryStocks(): Promise<
  {
    themeCode: string
    themeName: string
    subThemeName: string
    type: number
    code: string
    name: string
  }[]
> {
  const db = getDb()
  const stmt = await db.query(
    `SELECT sector_code as themeCode, sector_name as themeName, sub_sector_name as subThemeName, type, code, name FROM sector_stocks where is_etf = 0 AND is_hidden = 0`
  )
  return stmt.all() as {
    themeCode: string
    themeName: string
    subThemeName: string
    type: number
    code: string
    name: string
  }[]
}
