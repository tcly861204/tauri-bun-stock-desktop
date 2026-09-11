import { CONFIG } from '@/utils/const.ts'
import { join } from 'node:path'
import { cpus } from 'node:os'
import { ProgressBar } from '@/utils/format.ts'
import { type ScanResult } from './type'

export async function scanWithWorkers(
  stocks: { type: number; code: string; name: string }[],
  dataDir: string,
  rebackNum = 0
) {
  const total = stocks.length
  const cpuCount = cpus().length
  const workerCount = Math.min(cpuCount, 8)
  const batches: { type: number; code: string; name: string }[][] = []
  const batchSize = Math.ceil(total / workerCount)
  for (let i = 0; i < total; i += batchSize) {
    batches.push(stocks.slice(i, i + batchSize))
  }
  const actualWorkers = batches.length
  console.log(`  使用 ${actualWorkers} 个 Worker 并行扫描 ${total} 只股票...`)
  const allResults: ScanResult[] = []
  const workerProgress = new Array(actualWorkers).fill(0)
  const pb = new ProgressBar(total, '扫描中...')
  await Promise.all(
    batches.map((batch, workerIdx) => {
      return new Promise<void>((resolve) => {
        const worker = new Worker(join(CONFIG.WORKER_DIR, 'scanWorker.js'), {
          type: 'module',
        })
        let resolved = false
        worker.postMessage({ stocks: batch, dataDir: dataDir, rebackNum })
        worker.onmessage = (e: MessageEvent) => {
          const msg = e.data as { type: string; results?: ScanResult[]; completed?: number }
          if (msg.type === 'progress') {
            const prev = workerProgress[workerIdx]!
            workerProgress[workerIdx] = msg.completed ?? 0
            pb.inc(workerProgress[workerIdx]! - prev)
          } else if (msg.type === 'done') {
            if (resolved) return
            resolved = true
            if (msg.results) {
              for (const r of msg.results) allResults.push(r)
            }
            worker.terminate()
            resolve()
          }
        }
        worker.onerror = () => {
          if (resolved) return
          resolved = true
          worker.terminate()
          resolve()
        }
      })
    })
  )
  pb.finish('扫描完成')
  return allResults
}
