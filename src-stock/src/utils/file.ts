import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { HevEntry } from './const'

/** 确保目录存在 */
export function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

/** 确保文件是否存在 */
export async function ensureFile(file: string): Promise<Boolean> {
  const check = Bun.file(file)
  if (await check.exists()) {
    return true
  }
  return false
}

/** 读取目录下所有 JSON 文件路径 */
export function listJsonFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => join(dir, f))
}

/** 读取 hev 文件行 */
export function readHevLines(filePath: string): string[] {
  const content = readFileSync(filePath, 'utf-8')
  return content.split('\n').filter((l) => l.trim().length > 0)
}

/** 写入 hev 文件 */
export function writeHevFile(filePath: string, entries: HevEntry[]): void {
  const content = entries.map((e) => `${e.code}\t${e.name}\t${e.suffix}`).join('\n')
  writeFileSync(filePath, content, 'utf-8')
}

/** 判断是否为特殊股票（ST、星号、退市等） */
export function isSpecialStock(name: string): boolean {
  const upper = name.toUpperCase()
  return (
    upper.includes('ST') ||
    name.includes('*') ||
    name.includes('退市') ||
    name.includes('风险警示') ||
    name.includes('N退') ||
    name.includes('C退')
  )
}

/** 获取 hev 后缀 */
export function getHevSuffix(code: string): string {
  return code.startsWith('6') || code.startsWith('9') ? 'VV0U33==' : 'VV0a33=='
}
/** 股票类型转换为 hev 后缀 */
export function typeToHevSuffix(type: number, isETF: boolean = false): string {
  if (isETF) {
    return type === 0 ? 'VV0a6K==' : 'VV0U6K=='
  }
  return type === 1 ? 'VV0U33==' : 'VV0a33=='
}

/** 读取本地 JSON 股票数据文件 */
export function readStockJsonFile(filePath: string): Record<string, any> {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch (_) {
    return {}
  }
}

/** 写入 JSON 文件（美化） */
export function writePrettyJson(filePath: string, data: any): void {
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}
