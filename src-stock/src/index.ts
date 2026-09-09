#!/usr/bin/env bun
import { Command } from 'commander'
import { select as inqSelect } from '@inquirer/prompts'
import update_cmd from './command/update.ts'
import download_cmd from './command/download.ts'
const program = new Command()
program
  .name('stock')
  .description('A股命令行工具 — 涨幅榜、K线下载、技术分析、形态扫描')
  .version('1.0.0')
  .action(async () => {
    const choices = [
      { name: '⬇️  Download stock data', value: 'download' },
      { name: '🔄 Update kline data from real-time quote', value: 'update' },
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
          const { handleDownload } = await import('./command/download.ts')
          await handleDownload()
          break
        case 'update':
          const { handleUpdate } = await import('./command/update.ts')
          await handleUpdate()
          break
      }
    } catch (_) {}
  })
  .addCommand(update_cmd)
  .addCommand(download_cmd)
program.parse(process.argv)
