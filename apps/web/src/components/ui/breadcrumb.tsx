'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

const routeNames: Record<string, string> = {
  'settings': 'Settings',
  'profile': 'Profile',
  'account': 'Account',
  'sessions': 'Sessions',
  'preferences': 'Job Preferences',
  'privacy': 'Privacy',
  'notifications': 'Notifications'
}

interface BreadcrumbProps {
  className?: string
}

export function Breadcrumb({ className }: BreadcrumbProps) {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  
  if (segments.length <= 1) return null

  return (
    <nav className={cn("flex items-center space-x-1 text-sm text-gray-500", className)}>
      <Link 
        href="/dashboard" 
        className="hover:text-gray-700 transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      
      {segments.map((segment, index) => {
        const href = '/' + segments.slice(0, index + 1).join('/')
        const isLast = index === segments.length - 1
        const name = routeNames[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
        
        return (
          <div key={href} className="flex items-center space-x-1">
            <ChevronRight className="h-4 w-4" />
            {isLast ? (
              <span className="font-medium text-gray-900">{name}</span>
            ) : (
              <Link 
                href={href} 
                className="hover:text-gray-700 transition-colors"
              >
                {name}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}