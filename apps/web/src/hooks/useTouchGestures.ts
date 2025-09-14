// Import React hooks for gesture handling
import { useRef, useEffect, useCallback, useState } from 'react'

// Interface for touch gesture options
interface TouchGestureOptions {
  onSwipeLeft?: () => void // Callback for left swipe
  onSwipeRight?: () => void // Callback for right swipe
  onSwipeUp?: () => void // Callback for up swipe
  onSwipeDown?: () => void // Callback for down swipe
  onPinchStart?: () => void // Callback for pinch start
  onPinchEnd?: () => void // Callback for pinch end
  onPinchZoom?: (scale: number) => void // Callback for pinch zoom with scale
  onPullToRefresh?: () => void // Callback for pull to refresh
  swipeThreshold?: number // Minimum distance for swipe detection (default: 50px)
  velocityThreshold?: number // Minimum velocity for swipe detection (default: 0.3)
  pullThreshold?: number // Minimum pull distance for refresh (default: 80px)
  enableSwipe?: boolean // Enable swipe gestures (default: true)
  enablePinch?: boolean // Enable pinch gestures (default: false)
  enablePullToRefresh?: boolean // Enable pull to refresh (default: false)
}

// Interface for touch point data
interface TouchPoint {
  x: number // X coordinate
  y: number // Y coordinate
  timestamp: number // Timestamp when touch occurred
}

// Custom hook for handling touch gestures on mobile devices
export function useTouchGestures(options: TouchGestureOptions = {}) {
  // Destructure options with default values
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPinchStart,
    onPinchEnd,
    onPinchZoom,
    onPullToRefresh,
    swipeThreshold = 50,
    velocityThreshold = 0.3,
    pullThreshold = 80,
    enableSwipe = true,
    enablePinch = false,
    enablePullToRefresh = false
  } = options

  // Ref to store the element that will handle touch events
  const elementRef = useRef<HTMLElement | null>(null)
  
  // State for tracking touch gesture data
  const [touchStart, setTouchStart] = useState<TouchPoint | null>(null)
  const [touchEnd, setTouchEnd] = useState<TouchPoint | null>(null)
  const [isPinching, setIsPinching] = useState(false)
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null)
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)

  // Function to get distance between two touch points (for pinch gestures)
  const getDistance = useCallback((touches: TouchList) => {
    if (touches.length < 2) return 0
    
    // Get coordinates of first two touch points
    const touch1 = touches[0]
    const touch2 = touches[1]
    
    // Calculate Euclidean distance between touch points
    const deltaX = touch2.clientX - touch1.clientX
    const deltaY = touch2.clientY - touch1.clientY
    
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  }, [])

  // Function to handle touch start events
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    
    // Store initial touch point data
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    })
    
    // Reset touch end data
    setTouchEnd(null)

    // Handle pinch gesture start (requires 2+ fingers)
    if (enablePinch && e.touches.length >= 2) {
      setIsPinching(true)
      setInitialPinchDistance(getDistance(e.touches))
      onPinchStart?.()
    }

    // Handle pull to refresh start (only at top of page)
    if (enablePullToRefresh && window.scrollY === 0 && touch.clientY < 100) {
      setIsPulling(true)
      setPullDistance(0)
    }
  }, [enablePinch, enablePullToRefresh, getDistance, onPinchStart])

  // Function to handle touch move events
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStart) return

    const touch = e.touches[0]
    
    // Update touch end data during move
    setTouchEnd({
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    })

    // Handle pinch zoom during move
    if (isPinching && enablePinch && e.touches.length >= 2 && initialPinchDistance) {
      const currentDistance = getDistance(e.touches)
      const scale = currentDistance / initialPinchDistance
      onPinchZoom?.(scale)
    }

    // Handle pull to refresh during move
    if (isPulling && enablePullToRefresh) {
      const deltaY = touch.clientY - touchStart.y
      
      if (deltaY > 0 && window.scrollY === 0) {
        // Calculate pull distance with diminishing returns
        const pull = Math.min(deltaY * 0.5, pullThreshold * 1.5)
        setPullDistance(pull)
        
        // Prevent default scrolling during pull
        e.preventDefault()
      } else {
        // Stop pulling if user scrolls up or moves in wrong direction
        setIsPulling(false)
        setPullDistance(0)
      }
    }
  }, [touchStart, isPinching, enablePinch, initialPinchDistance, getDistance, onPinchZoom, isPulling, enablePullToRefresh, pullThreshold])

  // Function to handle touch end events
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchStart || !touchEnd) {
      // Reset all touch states
      setTouchStart(null)
      setTouchEnd(null)
      setIsPinching(false)
      setInitialPinchDistance(null)
      setIsPulling(false)
      setPullDistance(0)
      return
    }

    // Handle pinch gesture end
    if (isPinching) {
      setIsPinching(false)
      setInitialPinchDistance(null)
      onPinchEnd?.()
    }

    // Handle pull to refresh completion
    if (isPulling && pullDistance >= pullThreshold) {
      onPullToRefresh?.()
    }
    
    // Reset pull to refresh state
    setIsPulling(false)
    setPullDistance(0)

    // Handle swipe gestures only if swipe is enabled
    if (enableSwipe) {
      // Calculate swipe distance and time
      const deltaX = touchEnd.x - touchStart.x
      const deltaY = touchEnd.y - touchStart.y
      const deltaTime = touchEnd.timestamp - touchStart.timestamp
      
      // Calculate absolute distances
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)
      
      // Calculate velocity (distance per millisecond)
      const velocity = Math.max(absX, absY) / deltaTime
      
      // Check if swipe meets threshold requirements
      const isSwipe = (absX > swipeThreshold || absY > swipeThreshold) && velocity > velocityThreshold
      
      if (isSwipe) {
        // Determine swipe direction based on primary axis
        if (absX > absY) {
          // Horizontal swipe
          if (deltaX > 0) {
            onSwipeRight?.() // Swipe right
          } else {
            onSwipeLeft?.() // Swipe left
          }
        } else {
          // Vertical swipe
          if (deltaY > 0) {
            onSwipeDown?.() // Swipe down
          } else {
            onSwipeUp?.() // Swipe up
          }
        }
      }
    }

    // Reset touch states
    setTouchStart(null)
    setTouchEnd(null)
  }, [touchStart, touchEnd, isPinching, isPulling, pullDistance, pullThreshold, onPinchEnd, onPullToRefresh, enableSwipe, swipeThreshold, velocityThreshold, onSwipeRight, onSwipeLeft, onSwipeDown, onSwipeUp])

  // Set up touch event listeners when component mounts
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    // Add touch event listeners with passive option for better performance
    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: false })

    // Cleanup function to remove event listeners
    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  // Return ref and current gesture state
  return {
    elementRef, // Ref to attach to the element
    isPinching, // Whether user is currently pinching
    isPulling, // Whether user is currently pulling to refresh
    pullDistance, // Current pull distance for pull-to-refresh
    isAtPullThreshold: pullDistance >= pullThreshold // Whether pull threshold is met
  }
}