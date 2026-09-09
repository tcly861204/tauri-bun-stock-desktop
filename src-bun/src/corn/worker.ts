import { updateStocks } from './update'
export default {
  async scheduled(controller: Bun.CronController) {
    await updateStocks()
  },
}
