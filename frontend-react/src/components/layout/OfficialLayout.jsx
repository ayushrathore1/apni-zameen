import { useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { LoadingScreen } from '@/components/ui'

export function OfficialLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { isAuthenticated, isOfficial, isLoading } = useAuth()

  // Show loading while checking auth
  if (isLoading) {
    return <LoadingScreen message="Checking authentication..." />
  }

  // Redirect to login if not authenticated or not an official
  if (!isAuthenticated || !isOfficial) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      <main
        className={cn(
          'min-h-screen transition-all duration-300 ease-in-out',
          sidebarCollapsed ? 'pl-16' : 'pl-64'
        )}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
