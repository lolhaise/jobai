'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, Shield, Monitor, MapPin, Bell, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  {
    name: 'Profile',
    href: '/settings/profile',
    icon: User,
    description: 'Manage your profile information'
  },
  {
    name: 'Account',
    href: '/settings/account',
    icon: Shield,
    description: 'Security and account settings'
  },
  {
    name: 'Sessions',
    href: '/settings/sessions',
    icon: Monitor,
    description: 'Manage your active sessions'
  },
  {
    name: 'Job Preferences',
    href: '/settings/preferences',
    icon: MapPin,
    description: 'Set your job search preferences'
  },
  {
    name: 'Privacy',
    href: '/settings/privacy',
    icon: Eye,
    description: 'Control your data visibility'
  },
  {
    name: 'Notifications',
    href: '/settings/notifications',
    icon: Bell,
    description: 'Manage your notifications'
  }
]

export function SettingsNavigation() {
  const pathname = usePathname()

  return (
    <nav className="space-y-1">
      {navigation.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "group rounded-md px-3 py-2 flex items-center text-sm font-medium transition-colors",
              isActive
                ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                : "text-gray-900 hover:text-gray-900 hover:bg-gray-50"
            )}
          >
            <Icon 
              className={cn(
                "flex-shrink-0 -ml-1 mr-3 h-6 w-6",
                isActive
                  ? "text-blue-500"
                  : "text-gray-400 group-hover:text-gray-500"
              )} 
            />
            <span className="truncate">{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}