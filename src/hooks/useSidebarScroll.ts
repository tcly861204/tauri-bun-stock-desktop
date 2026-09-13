import { useEffect, useRef, useCallback } from 'react'
import type { SidebarItem } from '@/components/stock-item'
export function useSidebarScroll({
  sideList,
  selectCode,
  setSelectCode,
}: {
  sideList: SidebarItem[]
  selectCode: string
  setSelectCode: (code: string) => void
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const selectedIndex = sideList.findIndex((item) => `${item.type}-${item.code}` === selectCode)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (selectedIndex > 0) {
          setSelectCode(`${sideList[selectedIndex - 1].type}-${sideList[selectedIndex - 1].code}`)
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (selectedIndex < sideList.length - 1) {
          setSelectCode(`${sideList[selectedIndex + 1].type}-${sideList[selectedIndex + 1].code}`)
        }
      }
    },
    [selectedIndex, sideList, setSelectCode]
  )
  useEffect(() => {
    if (!listRef.current || !selectCode) return
    const el = listRef.current.querySelector(`[data-code="${selectCode}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectCode])
  useEffect(() => {
    listRef.current?.focus()
  }, [sideList.length])
  return {
    listRef,
    selectedIndex,
    handleKeyDown,
  }
}
