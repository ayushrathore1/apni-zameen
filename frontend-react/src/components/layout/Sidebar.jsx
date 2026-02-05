import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Map,
  AlertTriangle,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui'
import { useState } from 'react'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', labelHi: 'डैशबोर्ड', icon: LayoutDashboard },
  { path: '/map', label: 'Map View', labelHi: 'नक्शा', icon: Map },
  { path: '/discrepancies', label: 'Discrepancies', labelHi: 'विसंगतियाँ', icon: AlertTriangle },
  { path: '/records', label: 'Records', labelHi: 'अभिलेख', icon: FileText },
  { path: '/reports', label: 'Reports', labelHi: 'रिपोर्ट', icon: BarChart3 },
]

const adminItems = [
  { path: '/admin/users', label: 'Users', labelHi: 'उपयोगकर्ता', icon: Users },
  { path: '/admin/settings', label: 'Settings', labelHi: 'सेटिंग्स', icon: Settings },
]

export function Sidebar({ collapsed, onToggle }) {
  const location = useLocation()
  const { user, logout } = useAuth()
  const [language] = useState('en')

  const isAdmin = user?.role === 'ADMIN'

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Map className="size-4" />
              </div>
              <span className="font-semibold text-sm">
                {language === 'en' ? 'Land Records' : 'भूमि अभिलेख'}
              </span>
            </motion.div>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {collapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="size-5 shrink-0" />
                    {!collapsed && (
                      <span>{language === 'en' ? item.label : item.labelHi}</span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Admin Section */}
          {isAdmin && (
            <>
              <div className="mx-4 my-4 border-t border-sidebar-border" />
              <div className="px-4 pb-2">
                {!collapsed && (
                  <span className="text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50">
                    {language === 'en' ? 'Admin' : 'व्यवस्थापक'}
                  </span>
                )}
              </div>
              <ul className="space-y-1 px-2">
                {adminItems.map((item) => {
                  const isActive = location.pathname === item.path
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        )}
                        title={collapsed ? item.label : undefined}
                      >
                        <item.icon className="size-5 shrink-0" />
                        {!collapsed && (
                          <span>{language === 'en' ? item.label : item.labelHi}</span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </nav>

        {/* User Info & Logout */}
        <div className="border-t border-sidebar-border p-4">
          {!collapsed && user && (
            <div className="mb-3 px-2">
              <p className="text-sm font-medium text-sidebar-foreground">
                {user.name || user.email}
              </p>
              <p className="text-xs text-sidebar-foreground/60">{user.role}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size={collapsed ? 'icon-sm' : 'sm'}
            onClick={logout}
            className={cn(
              'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground',
              !collapsed && 'w-full justify-start gap-3'
            )}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="size-4" />
            {!collapsed && (language === 'en' ? 'Logout' : 'लॉगआउट')}
          </Button>
        </div>
      </div>
    </aside>
  )
}
