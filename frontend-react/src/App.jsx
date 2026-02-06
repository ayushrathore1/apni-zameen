import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/context/AuthContext'
import { CitizenLayout, OfficialLayout } from '@/components/layout'
import { HomePage, LoginPage, DashboardPage, MapPage, DiscrepanciesPage, ReportsPage, AdminPage } from '@/pages'

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

// Placeholder pages for routes not yet implemented
function SearchPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Search Records</h1>
      <p className="text-muted-foreground">
        Search functionality will be implemented in a future phase.
      </p>
    </div>
  )
}

function RecordsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Land Records</h1>
      <p className="text-muted-foreground">
        Records management will be implemented in a future phase.
      </p>
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-8">Page not found</p>
        <a href="/" className="text-primary hover:underline">
          Go back home
        </a>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes - Citizen Layout */}
            <Route element={<CitizenLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/search" element={<SearchPage />} />
            </Route>

            {/* Auth Routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes - Official Layout */}
            <Route element={<OfficialLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/discrepancies" element={<DiscrepanciesPage />} />
              <Route path="/records" element={<RecordsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

