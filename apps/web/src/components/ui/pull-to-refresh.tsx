'use client'

// Pull to refresh component for mobile devices
import { useState, useRef, ReactNode } from 'react'
// Import touch gesture hook
import { useTouchGestures } from '@/hooks/useTouchGestures'
// Import icons for refresh indicator
import { RefreshCw, ArrowDown } from 'lucide-react'
// Import utility function for conditional classes
import { cn } from '@/lib/utils'

// Props interface for pull to refresh component
interface PullToRefreshProps {
  children: ReactNode // Content to wrap
  onRefresh: () => Promise<void> | void // Refresh callback function
  disabled?: boolean // Whether refresh is disabled
  className?: string // Additional CSS classes
  threshold?: number // Pull threshold in pixels (default: 80)
  refreshingText?: string // Text to show while refreshing
  pullText?: string // Text to show while pulling
  releaseText?: string // Text to show when threshold is met
}

// Pull to refresh component for mobile touch interfaces
export function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
  className,
  threshold = 80,
  refreshingText = 'Refreshing...',
  pullText = 'Pull to refresh',
  releaseText = 'Release to refresh'
}: PullToRefreshProps) {
  // State to track refresh status
  const [isRefreshing, setIsRefreshing] = useState(false)
  // State to track pull progress
  const [pullProgress, setPullProgress] = useState(0)
  
  // Container ref for the component
  const containerRef = useRef<HTMLDivElement>(null)

  // Function to handle refresh trigger
  const handleRefresh = async () => {
    if (disabled || isRefreshing) return
    
    try {
      setIsRefreshing(true) // Set refreshing state
      await onRefresh() // Execute refresh callback
    } catch (error) {
      console.error('[PullToRefresh] Refresh failed:', error)
    } finally {
      setIsRefreshing(false) // Reset refreshing state
      setPullProgress(0) // Reset pull progress
    }
  }

  // Configure touch gestures with pull-to-refresh
  const { elementRef, isPulling, pullDistance, isAtPullThreshold } = useTouchGestures({
    enablePullToRefresh: !disabled, // Enable only if not disabled
    pullThreshold: threshold, // Set threshold for refresh trigger
    onPullToRefresh: handleRefresh, // Handle refresh trigger
    enableSwipe: false, // Disable swipe for this component
    enablePinch: false // Disable pinch for this component
  })

  // Update pull progress when pulling
  const progress = Math.min((pullDistance / threshold) * 100, 100)
  
  // Set refs to the same element
  const setRefs = (element: HTMLDivElement | null) => {
    containerRef.current = element
    elementRef.current = element
  }

  // Calculate indicator transform based on pull distance
  const indicatorTransform = Math.min(pullDistance * 0.5, threshold)
  
  // Determine current status message
  const getStatusMessage = () => {
    if (isRefreshing) return refreshingText
    if (isAtPullThreshold) return releaseText
    if (isPulling) return pullText
    return ''
  }

  return (
    <div
      ref={setRefs}
      className={cn('relative overflow-hidden', className)}
    >
      {/* Pull indicator - shows when pulling */}
      <div
        className={cn(
          // Base styles for pull indicator
          'absolute top-0 left-0 right-0 z-10 flex items-center justify-center transition-transform duration-200',
          // Background and text styling
          'bg-white border-b border-gray-200 text-gray-600',
          // Height and padding
          'h-16 px-4',
          // Transform based on pull state
          isPulling || isRefreshing ? 'transform' : 'transform -translate-y-full'
        )}
        style={{
          // Dynamic transform based on pull distance
          transform: isPulling || isRefreshing 
            ? `translateY(${indicatorTransform - 64}px)` 
            : 'translateY(-100%)'
        }}
      >
        <div className=\"flex items-center space-x-3\">
          {/* Refresh icon with rotation animation */}
          <div className={cn(
            'transition-transform duration-300',
            isRefreshing && 'animate-spin'
          )}>
            {isAtPullThreshold || isRefreshing ? (
              <RefreshCw className={cn(
                'w-5 h-5',
                isAtPullThreshold ? 'text-blue-600' : 'text-gray-600'
              )} />
            ) : (
              <ArrowDown className={cn(
                'w-5 h-5 transition-transform duration-200',
                isPulling && 'transform rotate-180'
              )} />
            )}
          </div>
          
          {/* Status text */}
          <span className={cn(
            'text-sm font-medium transition-colors duration-200',
            isAtPullThreshold ? 'text-blue-600' : 'text-gray-600'
          )}>
            {getStatusMessage()}
          </span>
          
          {/* Progress indicator */}
          {isPulling && !isRefreshing && (
            <div className=\"flex items-center space-x-2\">
              <div className=\"w-8 h-1 bg-gray-200 rounded-full overflow-hidden\">
                <div 
                  className={cn(
                    'h-full transition-all duration-100 rounded-full',
                    isAtPullThreshold ? 'bg-blue-600' : 'bg-gray-400'
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className=\"text-xs text-gray-500\">
                {Math.round(progress)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div
        className={cn(
          // Apply transform when pulling to show indicator
          'transition-transform duration-200',
          (isPulling || isRefreshing) && 'transform'
        )}
        style={{
          // Move content down when pulling
          transform: (isPulling || isRefreshing) 
            ? `translateY(${Math.min(indicatorTransform, 16)}px)` 
            : 'translateY(0px)'
        }}
      >
        {children}
      </div>
      
      {/* Overlay during refresh to prevent interaction */}
      {isRefreshing && (
        <div className=\"absolute inset-0 bg-white bg-opacity-50 z-20 flex items-center justify-center\">
          <div className=\"flex items-center space-x-3 bg-white px-4 py-2 rounded-full shadow-md\">
            <RefreshCw className=\"w-4 h-4 animate-spin text-blue-600\" />
            <span className=\"text-sm text-gray-600\">{refreshingText}</span>
          </div>
        </div>
      )}
    </div>
  )
}