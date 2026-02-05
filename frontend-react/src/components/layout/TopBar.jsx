import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Map, 
  Search, 
  Globe, 
  Menu,
  X,
  User,
  LogIn
} from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

export function TopBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [language, setLanguage] = useState('en')
  const location = useLocation()
  const { user, isAuthenticated } = useAuth()

  const navLinks = [
    { path: '/', label: { en: 'Home', hi: 'होम' }, icon: Map },
    { path: '/map', label: { en: 'Map', hi: 'नक्शा' }, icon: Map },
    { path: '/search', label: { en: 'Search', hi: 'खोजें' }, icon: Search },
  ]

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'hi' : 'en'))
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Map className="size-5" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-foreground">
                {language === 'en' ? 'Land Records' : 'भूमि अभिलेख'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {language === 'en' ? 'Digitization Assistant' : 'डिजिटलीकरण सहायक'}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  )}
                >
                  <link.icon className="size-4" />
                  {link.label[language]}
                </Link>
              )
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLanguage}
              className="hidden sm:flex"
              aria-label="Toggle language"
            >
              <Globe className="size-5" />
            </Button>

            {/* Auth Button */}
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="size-4" />
                  <span className="hidden sm:inline">{user?.name || 'Dashboard'}</span>
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button size="sm" className="gap-2">
                  <LogIn className="size-4" />
                  <span className="hidden sm:inline">
                    {language === 'en' ? 'Official Login' : 'अधिकारी लॉगिन'}
                  </span>
                </Button>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="border-t border-border bg-card md:hidden"
        >
          <nav className="container mx-auto px-4 py-4 space-y-2">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  )}
                >
                  <link.icon className="size-5" />
                  {link.label[language]}
                </Link>
              )
            })}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <Globe className="size-5" />
              {language === 'en' ? 'हिंदी में बदलें' : 'Switch to English'}
            </button>
          </nav>
        </motion.div>
      )}
    </header>
  )
}
