import create from '@/libs/create'
import { useCallback, useRef } from 'react'
import type { FunctionComponent } from 'react'
import StockChartModel from '@/components/chart-model/index'

export function useCreateStockModel() {
  const parentNode = useRef<HTMLDivElement | null>(null)
  const handleStockClick = useCallback(
    (code: string, isETF: boolean = false, isTheme = false, themeCode?: string, extInfo?: any) => {
      parentNode.current = create(
        StockChartModel as FunctionComponent,
        {
          code,
          isETF,
          isTheme,
          themeCode,
          extInfo,
        },
        true
      )
    },
    []
  )
  return {
    handleStockClick,
  }
}
