import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import OTs from './pages/OTs'
import NewOT from './pages/NewOT'
import OTDetail from './pages/OTDetail'
import Clients from './pages/Clients'
import Scanner from './pages/Scanner'
import Bitacora from './pages/Bitacora'
import SpareParts from './pages/SpareParts'
import Quotes from './pages/Quotes'
import Tasks from './pages/Tasks'
import Finance from './pages/Finance'
import Expenses from './pages/Expenses'
import Invoices from './pages/Invoices'

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } })

function RequireAuth({ children }: { children: React.ReactNode }) {
  return localStorage.getItem('token') ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="ots" element={<OTs />} />
            <Route path="ots/nueva" element={<NewOT />} />
            <Route path="ots/:id" element={<OTDetail />} />
            <Route path="clientes" element={<Clients />} />
            <Route path="presupuestos" element={<Quotes />} />
            <Route path="repuestos" element={<SpareParts />} />
            <Route path="tareas" element={<Tasks />} />
            <Route path="bitacora" element={<Bitacora />} />
            <Route path="scanner" element={<Scanner />} />
            <Route path="finanzas" element={<Finance />} />
            <Route path="gastos" element={<Expenses />} />
            <Route path="facturas" element={<Invoices />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
