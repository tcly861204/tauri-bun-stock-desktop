import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'
import Layout from '@/layout'
const Home = lazy(() => import('@/pages/home'))
const Buy = lazy(() => import('@/pages/buy'))
const Collection = lazy(() => import('@/pages/collection'))
const Globe = lazy(() => import('@/pages/globe'))
const King = lazy(() => import('@/pages/king'))
const Scan = lazy(() => import('@/pages/scan'))
const Setting = lazy(() => import('@/pages/setting'))
const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: '/buy',
        element: <Buy />,
      },
      {
        path: '/collection',
        element: <Collection />,
      },
      {
        path: '/globe',
        element: <Globe />,
      },
      {
        path: '/king',
        element: <King />,
      },
      {
        path: '/scan',
        element: <Scan />,
      },
      {
        path: '/setting',
        element: <Setting />,
      },
    ],
  },
]

export default routes
