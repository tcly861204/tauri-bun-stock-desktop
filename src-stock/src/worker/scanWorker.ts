/// <reference no-default-lib="true"/>
/// <reference lib="webworker" />

import { scanOne } from '@/scan/scanOne.ts'
import { type ScanResult } from '@/scan/type.ts'

interface StockInfo {
  type: number
  code: string
  name: string
}

interface WorkerInput {
  stocks: StockInfo[]
  tops: Map<string, string>
  dataDir: string
  rebackNum: number
}

const PROGRESS_INTERVAL = 50

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { stocks, dataDir, rebackNum } = e.data
  const results: ScanResult[] = []
  const total = stocks.length

  for (let i = 0; i < total; i++) {
    const { type, code, name } = stocks[i]!
    try {
      const r = scanOne(type, code, name, dataDir, rebackNum)
      if (r) results.push(r)
    } catch {
      // skip
    }

    if ((i + 1) % PROGRESS_INTERVAL === 0 || i === total - 1) {
      self.postMessage({ type: 'progress', completed: i + 1, total })
    }
  }

  self.postMessage({ type: 'done', results })
}
