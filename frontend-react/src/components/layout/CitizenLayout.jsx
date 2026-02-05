import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'

export function CitizenLayout() {
  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
