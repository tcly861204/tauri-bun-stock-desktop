import { Command } from 'commander'
const program = new Command()
export const handleDownload = async () => {
  console.log('下载股票K线')
}
export default program.name('download').description('下载股票K线').action(handleDownload)
