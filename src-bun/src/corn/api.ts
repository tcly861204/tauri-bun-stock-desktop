/** 批量获取腾讯实时行情 API — GBK → UTF-8 解码 */
export async function getBatchRealtimeQuotes(codes: string[]): Promise<string[]> {
  const url = `http://qt.gtimg.cn/q=${codes.join(',')}`
  const resp = await fetch(url)
  const buf = await resp.arrayBuffer()
  // @ts-ignore
  return new TextDecoder('gbk').decode(buf).split('\n')
}
