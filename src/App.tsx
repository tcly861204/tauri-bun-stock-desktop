import { BrowserRouter, useRoutes } from 'react-router-dom'
import routes from './routes'

const Router = () => {
  const element = useRoutes(routes)
  return element
}
const App = () => {
  return (
    <BrowserRouter basename='/'>
      <Router />
    </BrowserRouter>
  )
}

export default App
