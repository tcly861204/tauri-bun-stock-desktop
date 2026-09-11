#!/usr/bin/env bun
import { Command } from 'commander'
import { select as inqSelect } from '@inquirer/prompts'
import update_cmd from '@/commands/update.ts'
import download_cmd from '@/commands/download.ts'
import king_cmd from '@/commands/king.ts'
import cron_cmd from '@/commands/cron.ts'
import scan_cmd from '@/scan/index.ts'

const program = new Command()
program
  .name('stock')
  .description('A股命令行工具 — 涨幅榜、K线下载、技术分析、形态扫描')
  .version('1.0.0')
  .action(async () => {
    const choices = [
      { name: '⬇️  Download stock data', value: 'download' },
      { name: '🔄 Update kline data from real-time quote', value: 'update' },
      { name: '📈 Top 涨幅榜', value: 'king' },
      { name: '🌱 多模型扫描', value: 'scan' },
    ]
    try {
      let selectedKey: string
      selectedKey = await inqSelect({
        message: '请选择要执行的操作',
        loop: false,
        choices,
      })
      switch (selectedKey) {
        case 'download':
          const { handleDownload } = await import('@/commands/download.ts')
          await handleDownload()
          break
        case 'update':
          const { handleUpdate } = await import('@/commands/update.ts')
          await handleUpdate()
          break
        case 'king':
          const { handleKing } = await import('@/commands/king.ts')
          await handleKing()
          break
        case 'scan':
          const { handleScan } = await import('@/scan/index.ts')
          await handleScan()
          break
      }
    } catch (_) {}
  })
  .addCommand(update_cmd)
  .addCommand(download_cmd)
  .addCommand(king_cmd)
  .addCommand(cron_cmd)
  .addCommand(scan_cmd)
program.parse(process.argv)
