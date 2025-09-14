'use client'

// Import React hooks for component state management
import { useState, useEffect } from 'react'
// Import Next.js navigation utilities
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
// Import icons for navigation and UI elements
import { 
  Menu, 
  X, 
  Home, 
  Search, 
  Briefcase, 
  FileText, 
  Settings,
  User,
  Bell,
  LogOut
} from 'lucide-react'
// Import UI components from shadcn/ui
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
// Import utility function for conditional classes
import { cn } from '@/lib/utils'
// Import session management from NextAuth
import { useSession, signOut } from 'next-auth/react'

// Define the navigation menu structure for mobile devices
const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    description: 'Overview of your job search'
  },
  {
    name: 'Job Search',
    href: '/jobs',
    icon: Search,
    description: 'Find new opportunities'
  },
  {
    name: 'Applications',
    href: '/applications',
    icon: Briefcase,
    description: 'Track your applications'
  },
  {
    name: 'Resume Builder',
    href: '/resume',
    icon: FileText,
    description: 'Create and edit resumes'
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'Account preferences'
  }
]

// Props interface for the MobileNav component
interface MobileNavProps {
  className?: string // Optional className for styling
}

// Main mobile navigation component with hamburger menu
export function MobileNav({ className }: MobileNavProps) {
  // State to control the mobile menu open/closed state
  const [isOpen, setIsOpen] = useState(false)
  // Hook to get current pathname for active state
  const pathname = usePathname()
  // Hook for programmatic navigation
  const router = useRouter()
  // Hook to get user session data
  const { data: session, status } = useSession()

  // Effect to close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Effect to prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      // Add class to prevent scrolling when menu is open
      document.body.classList.add('overflow-hidden')
    } else {
      // Remove class to allow scrolling when menu is closed
      document.body.classList.remove('overflow-hidden')
    }

    // Cleanup function to remove class on component unmount
    return () => {
      document.body.classList.remove('overflow-hidden')
    }
  }, [isOpen])

  // Function to handle navigation item clicks
  const handleNavClick = (href: string) => {
    setIsOpen(false) // Close the menu
    router.push(href) // Navigate to the route
  }

  // Function to handle user sign out
  const handleSignOut = async () => {
    setIsOpen(false) // Close the menu first
    await signOut({ callbackUrl: '/' }) // Sign out and redirect to home
  }

  return (
    <div className={cn("md:hidden", className)}>
      {/* Mobile Header Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo and Brand */}
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">JobAI</span>
          </Link>

          {/* Right side actions */}
          <div className="flex items-center space-x-2">
            {/* Notifications badge */}
            <Button variant="ghost" size="sm" className="relative p-2">
              <Bell className="w-5 h-5 text-gray-600" />
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs p-0"
              >
                3
              </Badge>
            </Button>

            {/* Mobile menu trigger */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Menu className="w-6 h-6 text-gray-600" />
                  <span className="sr-only">Open navigation menu</span>
                </Button>
              </SheetTrigger>

              {/* Mobile menu sheet content */}
              <SheetContent 
                side="right" 
                className="w-80 p-0 bg-white"
              >
                {/* Sheet header with user info */}
                <div className="px-6 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                  {/* Close button */}
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setIsOpen(false)}
                      className="p-2"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* User profile section */}
                  {session && (
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage 
                          src={session.user?.image || undefined} 
                          alt={session.user?.name || 'User'} 
                        />
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {session.user?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {session.user?.name || 'User'}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {session.user?.email}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation items */}
                <div className="px-4 py-4 flex-1 overflow-y-auto">
                  <nav className="space-y-2">
                    {navigationItems.map((item) => {
                      // Check if current route matches navigation item
                      const isActive = pathname === item.href || 
                        pathname.startsWith(item.href + '/')
                      
                      return (
                        <button
                          key={item.name}
                          onClick={() => handleNavClick(item.href)}
                          className={cn(
                            // Base styles for navigation buttons
                            'w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors duration-200',
                            // Active state styles
                            isActive
                              ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          )}
                        >
                          <item.icon className={cn(
                            'w-5 h-5',
                            isActive ? 'text-blue-600' : 'text-gray-500'
                          )} />
                          <div className="flex-1">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {item.description}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </nav>
                </div>

                {/* Bottom actions */}
                <div className="px-4 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="space-y-2">
                    {/* Profile button */}
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-gray-700 hover:text-gray-900 hover:bg-white"
                      onClick={() => handleNavClick('/profile')}
                    >
                      <User className="w-4 h-4 mr-3" />
                      View Profile
                    </Button>

                    {/* Sign out button */}
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={handleSignOut}
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Spacer to account for fixed header */}
      <div className="h-16" />
    </div>
  )
}