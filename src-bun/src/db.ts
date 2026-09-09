import { os } from '@orpc/server'
import * as z from 'zod'
import { Database } from 'bun:sqlite'
const DB_PATH = 'D:\\soft\\stock-app-local-data\\database\\stock.db'
let _db: Database | null = null
function getDb(): Database {
  if (!_db) {
    _db = new Database(DB_PATH)
    _db.run('PRAGMA journal_mode=WAL')
    _db.run('PRAGMA busy_timeout=5000')
  }
  return _db
}

export const Query = os
  .input(z.object({ sql: z.string() }))
  .output(z.array(z.record(z.string(), z.any())))
  .handler(async ({ input }) => {
    const { sql } = input
    const db = getDb()
    return db.prepare(sql).all() as any[]
  })

export const Execute = os
  .input(z.object({ sql: z.string() }))
  .output(z.record(z.string(), z.any()))
  .handler(async ({ input }) => {
    const { sql } = input
    const db = getDb()
    const result = db.run(sql)
    return { changes: result.changes, lastInsertId: result.lastInsertRowid }
  })
