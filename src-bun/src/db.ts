import { os } from '@orpc/server'
import * as z from 'zod'
// @ts-ignore bun 运行时模块：前端的 tsconfig 解析不到它，但 main.ts 的 Router 类型会经由本文件传递过去
import { Database } from 'bun:sqlite'
import { CONFIG } from './const'
let _db: Database | null = null
function getDb(): Database {
  if (!_db) {
    _db = new Database(CONFIG.DATA_BASE_FILE)
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
