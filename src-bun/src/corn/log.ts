/** 格式化输出工具 */

const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const CYAN = '\x1b[36m'
const MAGENTA = '\x1b[35m'

export const colors = { RESET, BOLD, RED, GREEN, YELLOW, CYAN, MAGENTA }

/** 评分着色 */
export function formatScore(score: number): string {
  if (score >= 80) return `${GREEN}${BOLD}${score} 🔥${RESET}`
  if (score >= 70) return `${YELLOW}${BOLD}${score} ⭐${RESET}`
  if (score >= 60) return `${CYAN}${BOLD}${score} ✓${RESET}`
  return `${score}`
}

/** 打印分隔线 */
export function printSeparator(char = '═', len = 60): void {
  console.log(`  ${char.repeat(len)}`)
}

/** 打印标题块 */
export function printTitle(title: string): void {
  printSeparator()
  console.log(`  ${BOLD}${title}${RESET}`)
  printSeparator()
}

/** 进度条（简单版） */
export class ProgressBar {
  private total: number
  private current = 0
  private message = ''
  private startTime = Date.now()

  constructor(total: number, message: string) {
    this.total = total
    this.message = message
    this.render()
  }

  setMessage(msg: string): void {
    this.message = msg
  }

  inc(amount = 1): void {
    this.current += amount
    this.render()
  }

  private render(): void {
    const pct = Math.min(100, Math.round((this.current / this.total) * 100))
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1)
    const barLen = 40
    const filled = Math.round((pct / 100) * barLen)
    const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled)
    process.stdout.write(
      `\r  ${GREEN}✓${RESET} [${elapsed}s] [${bar}] ${this.current}/${this.total} (${pct}%) ${this.message}\x1b[K`
    )
  }

  finish(msg: string): void {
    this.render()
    process.stdout.write('\n')
    console.log(`  ✅ ${msg}`)
  }

  println(line: string): void {
    // 清除当前进度条行，输出消息，再在下方重绘进度条
    process.stdout.write('\r\x1b[K\n')
    console.log(line)
    this.render()
  }
}

/** 日志级别 */
export function logInfo(msg: string): void {
  console.log(`  ${CYAN}ℹ${RESET} ${msg}`)
}

export function logSuccess(msg: string): void {
  console.log(`  ${GREEN}✅${RESET} ${msg}`)
}

export function logError(msg: string): void {
  console.log(`  ${RED}❌${RESET} ${msg}`)
}

export function logWarn(msg: string): void {
  console.log(`  ${YELLOW}⚠${RESET} ${msg}`)
}
