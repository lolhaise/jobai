// Offline fallback page for PWA functionality
'use client'

// Import React hooks for component state
import { useEffect, useState } from 'react'
// Import Next.js router for navigation
import { useRouter } from 'next/navigation'
// Import icons for offline UI
import { 
  WifiOff, 
  RefreshCw, 
  Home, 
  Briefcase,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
// Import UI components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
// Import utility function for conditional classes
import { cn } from '@/lib/utils'

// Offline page component displayed when user has no internet connection
export default function OfflinePage() {
  // Hook for programmatic navigation
  const router = useRouter()
  // State to track online/offline status
  const [isOnline, setIsOnline] = useState(false)
  // State to track retry attempts
  const [retryCount, setRetryCount] = useState(0)
  // State to show retry animation
  const [isRetrying, setIsRetrying] = useState(false)

  // Effect to monitor online/offline status
  useEffect(() => {
    // Function to update online status
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine)
      if (navigator.onLine) {
        console.log('[Offline] Connection restored')
      }
    }

    // Set initial online status
    updateOnlineStatus()

    // Add event listeners for online/offline events
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    // Cleanup function to remove event listeners
    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  // Effect to handle automatic retry when connection is restored
  useEffect(() => {
    if (isOnline && retryCount > 0) {
      // Show success message briefly before redirecting
      const timer = setTimeout(() => {
        router.push('/dashboard')
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [isOnline, retryCount, router])

  // Function to handle manual retry attempts
  const handleRetry = async () => {
    setIsRetrying(true) // Show retry animation
    setRetryCount(prev => prev + 1) // Increment retry counter

    try {
      // Test connection by fetching a small resource
      const response = await fetch('/manifest.json', { 
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })
      
      if (response.ok) {
        // Connection successful, redirect to dashboard
        router.push('/dashboard')
      } else {
        // Connection failed, stay on offline page
        console.log('[Offline] Retry failed: Response not ok')
      }
    } catch (error) {
      // Connection still failed
      console.log('[Offline] Retry failed:', error)
    } finally {
      setIsRetrying(false) // Hide retry animation
    }
  }

  // Function to navigate to cached pages
  const navigateToCache = (path: string) => {
    router.push(path)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {/* Main offline container */}
      <div className="w-full max-w-md space-y-6">
        
        {/* Connection status alert */}
        <Alert className={cn(
          "transition-colors duration-300",
          isOnline 
            ? "border-green-200 bg-green-50 text-green-800"
            : "border-orange-200 bg-orange-50 text-orange-800"
        )}>
          {isOnline ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            {isOnline 
              ? "Connection restored! Redirecting..." 
              : "You're currently offline"
            }
          </AlertDescription>
        </Alert>

        {/* Main offline card */}
        <Card className="w-full">
          <CardHeader className="text-center pb-4">
            {/* Offline icon with animation */}
            <div className="mx-auto mb-4 relative">
              <div className={cn(
                "w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center transition-colors duration-300",
                isOnline ? "bg-green-100" : "bg-orange-100"
              )}>
                {isOnline ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : (
                  <WifiOff className="w-8 h-8 text-orange-600" />
                )}
              </div>
              {/* Pulse animation for offline state */}
              {!isOnline && (
                <div className="absolute inset-0 w-16 h-16 bg-orange-200 rounded-full animate-ping opacity-20" />
              )}
            </div>
            
            <CardTitle className="text-xl font-semibold text-gray-900">
              {isOnline ? "Back Online!" : "You're Offline"}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {isOnline 
                ? "Your internet connection has been restored"
                : "Please check your internet connection and try again"
              }
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Retry button */}
            <Button 
              onClick={handleRetry}
              disabled={isRetrying || isOnline}
              className="w-full"
              size="lg"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Retrying... ({retryCount})
                </>
              ) : isOnline ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Connected
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </>
              )}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  or browse cached content
                </span>
              </div>
            </div>

            {/* Cached content navigation */}
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigateToCache('/dashboard')}
              >
                <Home className="w-4 h-4 mr-3" />
                Dashboard (Cached)
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigateToCache('/applications')}
              >
                <Briefcase className="w-4 h-4 mr-3" />
                My Applications (Cached)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Offline tips card */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg">While You're Offline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <p>You can still view your cached job applications and resume</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <p>Any changes you make will be synced when you're back online</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <p>Check your network settings or try connecting to a different network</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connection info */}
        <div className="text-center text-xs text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
          {retryCount > 0 && (
            <span className="block mt-1">
              Retry attempts: {retryCount}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}