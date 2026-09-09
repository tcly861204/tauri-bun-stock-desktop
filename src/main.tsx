import { createRoot } from 'react-dom/client'
import 'animate.css/animate.min.css'
import '@/styles/global.css'
import App from './App'
import('@/assets/stock.json').then((res) => {
  localStorage.setItem('stock', JSON.stringify(res.default))
})
createRoot(document.getElementById('root') as HTMLElement).render(<App />)
