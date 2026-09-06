import { createServer } from 'tauri-plugin-tauribun'
import { os } from '@orpc/server'
import * as z from 'zod'

const router = {
  greet: os
    .input(z.object({ name: z.string() }))
    .output(z.object({ greeting: z.string() }))
    .handler(async ({ input }) => {
      console.log(input)
      return { greeting: `Hello from server, ${input.name}!` }
    }),
}

// 启动服务器，'server' 是服务器标识符
createServer('server', router)
export type Router = typeof router
console.log('服务器启动完成')
