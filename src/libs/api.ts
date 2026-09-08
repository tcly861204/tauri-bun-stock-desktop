import { client } from './orpc'
import $ from 'jquery'

export const queryDayKline = async (code: string) => {
  return await client.orpc.getStockkline({ code, type: 'day' }).then((res) => JSON.parse(res))
}
export const queryWeekKline = async (code: string) => {
  return await client.orpc.getStockkline({ code, type: 'week' }).then((res) => JSON.parse(res))
}
export const getTopIndex = async () => {
  const codes = [
    'sh000001', // 上证指数
    'sz399001', // 深证指数
    'sz399006', // 创业扳指
    'sh000300', // 沪深300
    'hkHSI', // 恒生100
    'sh000688', // 科创50
    'sh000016', // 上证50
    'bj899050', // 北证50
  ]
  const stocks = await client.orpc.getStockRealtime({ code: codes.join(',') })
  const list = stocks
    .split('\n')
    .filter((item) => item && item.length > 10)
    .map((item) => {
      const stock = item.split('~')
      return {
        full: stock[0].split('=')[0].slice(2).slice(0, 2) + '#' + stock[2],
        code: stock[2],
        name: stock[1],
        change: stock[32],
        vol: stock[3],
      }
    })
  return list
}

export const getGlobalList = (): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const codes =
      '1.000001,0.399001,0.399006,1.000300,1.000688,1.000016,0.399850,0.899050,100.HSI,107.YINN,251.HXC,100.N225,100.PX,100.NDX100,100.BFX,100.TWII,100.MIB,100.NZ50,100.ATX,100.SET,100.GDAXI,100.WIG,100.TSX,100.RTS,100.VNINDEX,100.OMXSPI,100.STI,100.CSEALL,100.AS51,100.KLSE,100.ASE,100.IBEX,100.KS11,100.HEX,100.DJIA,100.SPX,100.SSMI,100.MXX,100.TOP40,100.JKSE,100.KSE100,104.CN00Y,100.FTSE,100.NDX,100.FCHI,100.BVSP,100.ISEQ,100.ICEXI,100.AEX,100.SENSEX'
    $.ajax({
      url: `https://59.push2.eastmoney.com/api/qt/ulist.np/get?fid=f3&pi=0&pz=40&po=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&fields=f14,f12,f13,f2,f3,f4,f6,f104,f105,f106&np=1&secids=${codes}`,
      type: 'GET',
      dataType: 'jsonp',
      jsonp: 'cb',
      success: function (res) {
        resolve(res?.data?.diff || [])
      },
      error: reject,
    })
  })
}
