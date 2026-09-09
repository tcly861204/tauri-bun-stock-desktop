import { createRoot } from 'react-dom/client'
import { createElement } from 'react'
import type { FunctionComponent } from 'react'
const create = (
  app: FunctionComponent,
  options: Record<string, any> = {},
  animate: boolean = false
): HTMLDivElement => {
  const dom = document.createElement('div')
  const width = window.innerWidth
  const height = window.innerHeight
  document.body.appendChild(dom)
  document.body.style.overflow = 'hidden'
  dom.className = `${
    animate ? 'animate__animated animate__fadeIn ' : ''
  }fixed top-0 left-0 bg-[rgba(0,0,0,0.01)] z-20 backdrop-blur-sm`
  dom.style.cssText = `width: ${width}px; height: ${height}px;`
  const root = createRoot(dom)
  const handleClose = () => {
    document.body.style.overflow = 'unset'
    dom.remove()
  }
  root.render(createElement(app, { ...options, handleClose } as Record<string, any>))
  return dom
}

export default create
