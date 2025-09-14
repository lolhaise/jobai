'use client'

// Import React hooks for component state
import { useEffect, useState } from 'react'
// Import Next.js navigation utilities
import { usePathname, useRouter } from 'next/navigation'
// Import icons for bottom navigation
import { 
  Home, 
  Search, 
  Briefcase, 
  FileText, 
  User,
  Plus,
  MessageSquare
} from 'lucide-react'
// Import UI components
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
// Import utility function for conditional classes
import { cn } from '@/lib/utils'

// Define the bottom navigation structure optimized for mobile
const bottomNavItems = [
  {
    name: 'Home',
    href: '/dashboard',
    icon: Home,
    activeColor: 'text-blue-600',
    activeBg: 'bg-blue-50'
  },
  {
    name: 'Search',
    href: '/jobs',
    icon: Search,
    activeColor: 'text-green-600',
    activeBg: 'bg-green-50'
  },
  {
    name: 'Apply',
    href: '/applications/new',
    icon: Plus,
    activeColor: 'text-purple-600',
    activeBg: 'bg-purple-50',
    isSpecial: true // This will be the floating action button
  },
  {
    name: 'Apps',
    href: '/applications',
    icon: Briefcase,
    activeColor: 'text-orange-600',
    activeBg: 'bg-orange-50',
    hasNotification: true // Shows notification badge
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: User,
    activeColor: 'text-indigo-600',
    activeBg: 'bg-indigo-50'
  }
]

// Props interface for the BottomNav component
interface BottomNavProps {
  className?: string // Optional className for styling
}

// Bottom navigation component for mobile devices
export function BottomNav({ className }: BottomNavProps) {
  // Hook to get current pathname for active state
  const pathname = usePathname()
  // Hook for programmatic navigation
  const router = useRouter()
  // State to control visibility based on scroll
  const [isVisible, setIsVisible] = useState(true)
  // State to track last scroll position
  const [lastScrollY, setLastScrollY] = useState(0)

  // Effect to handle scroll-based visibility
  useEffect(() => {
    // Function to handle scroll events
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // Hide bottom nav when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false) // Hide when scrolling down
      } else {
        setIsVisible(true) // Show when scrolling up or at top
      }
      
      setLastScrollY(currentScrollY) // Update last scroll position
    }

    // Add scroll event listener with passive option for better performance
    window.addEventListener('scroll', handleScroll, { passive: true })

    // Cleanup function to remove event listener
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [lastScrollY])

  // Function to handle navigation item clicks
  const handleNavClick = (href: string) => {
    router.push(href) // Navigate to the route
  }

  // Function to check if a navigation item is active
  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      // Dashboard is active only on exact match
      return pathname === href
    }
    // Other routes are active if pathname starts with href
    return pathname.startsWith(href)
  }

  // Don't render bottom nav on certain pages (like admin)
  if (pathname.startsWith('/admin') || pathname.startsWith('/auth')) {
    return null
  }

  return (
    <div className={cn("md:hidden", className)}>
      {/* Bottom navigation container */}
      <nav 
        className={cn(
          // Base styles for bottom navigation
          'fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg transition-transform duration-300',
          // Apply transform based on visibility state
          isVisible ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* Safe area padding for devices with bottom insets */}
        <div className="pb-safe">
          <div className="flex items-center justify-around px-2 py-2">
            {bottomNavItems.map((item) => {
              // Check if current item is active
              const isActive = isActiveRoute(item.href)
              
              // Render special floating action button differently
              if (item.isSpecial) {
                return (
                  <div key={item.name} className="relative">
                    <Button
                      size="lg"
                      onClick={() => handleNavClick(item.href)}
                      className={cn(
                        // Floating action button styles
                        'w-14 h-14 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95',
                        isActive 
                          ? 'bg-purple-600 hover:bg-purple-700' 
                          : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                      )}
                    >
                      <item.icon className="w-6 h-6 text-white" />
                    </Button>
                    {/* Ripple effect for floating action button */}
                    {isActive && (
                      <div className="absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-20" />
                    )}
                  </div>
                )
              }

              // Render regular navigation items
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavClick(item.href)}
                  className={cn(
                    // Base styles for navigation buttons
                    'flex flex-col items-center justify-center p-2 min-w-[64px] transition-colors duration-200 relative',
                    // Touch target size for accessibility
                    'touch-manipulation'
                  )}
                >
                  {/* Icon container with active state styling */}
                  <div className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full transition-colors duration-200 relative',
                    isActive ? item.activeBg : 'hover:bg-gray-100'
                  )}>
                    <item.icon className={cn(
                      'w-5 h-5 transition-colors duration-200',
                      isActive ? item.activeColor : 'text-gray-500'
                    )} />
                    
                    {/* Notification badge */}
                    {item.hasNotification && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-xs p-0"
                      >
                        2
                      </Badge>
                    )}
                  </div>
                  
                  {/* Label text */}
                  <span className={cn(
                    'text-xs mt-1 font-medium transition-colors duration-200',
                    isActive ? item.activeColor : 'text-gray-500'
                  )}>
                    {item.name}
                  </span>
                  
                  {/* Active indicator dot */}
                  {isActive && (
                    <div className={cn(
                      'absolute -bottom-1 w-1 h-1 rounded-full',
                      item.activeColor.replace('text-', 'bg-')
                    )} />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Spacer to account for fixed bottom navigation */}
      <div className="h-20" />
    </div>
  )
}