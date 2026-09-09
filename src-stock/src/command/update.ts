import { Command } from 'commander'
const program = new Command()
export const handleUpdate = async () => {
  console.log('更新股票数据')
}
export default program.name('update').description('通过实时行情更新本地 K 线').action(handleUpdate)
