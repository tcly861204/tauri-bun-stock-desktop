import { CONFIG } from './const'
/** 每天上午10点更新一次数据（周一至周五） */
await Bun.cron(`${CONFIG.CRON_DIR}\\worker.ts`, '0 0 10 * * 1-5', 'update')
