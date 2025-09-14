// Custom hook for responsive design utilities
import { useState, useEffect, useCallback } from 'react'

// Interface for responsive breakpoint values
interface ResponsiveBreakpoints {
  sm: boolean // >= 640px
  md: boolean // >= 768px
  lg: boolean // >= 1024px
  xl: boolean // >= 1280px
  '2xl': boolean // >= 1536px
}

// Interface for responsive hook return value
interface UseResponsiveReturn extends ResponsiveBreakpoints {
  width: number // Current viewport width
  height: number // Current viewport height
  isMobile: boolean // Width < 768px
  isTablet: boolean // Width >= 768px && width < 1024px
  isDesktop: boolean // Width >= 1024px
  orientation: 'portrait' | 'landscape' // Device orientation
  isTouch: boolean // Whether device supports touch
  isOnline: boolean // Network connectivity status
  pixelRatio: number // Device pixel ratio for high-DPI displays
}

// Custom hook for responsive design and device detection
export function useResponsive(): UseResponsiveReturn {
  // State for viewport dimensions
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0
  })
  
  // State for breakpoint matches
  const [breakpoints, setBreakpoints] = useState<ResponsiveBreakpoints>({
    sm: false,
    md: false,
    lg: false,
    xl: false,
    '2xl': false
  })
  
  // State for device capabilities
  const [deviceInfo, setDeviceInfo] = useState({
    isTouch: false,
    pixelRatio: 1
  })
  
  // State for network connectivity
  const [isOnline, setIsOnline] = useState(true)

  // Function to update dimensions and breakpoints
  const updateDimensions = useCallback(() => {
    // Get current viewport dimensions
    const width = window.innerWidth
    const height = window.innerHeight
    
    // Update dimensions state
    setDimensions({ width, height })
    
    // Calculate breakpoint matches based on Tailwind CSS defaults
    setBreakpoints({
      sm: width >= 640,   // Small devices and up
      md: width >= 768,   // Medium devices and up
      lg: width >= 1024,  // Large devices and up
      xl: width >= 1280,  // Extra large devices and up
      '2xl': width >= 1536 // 2X large devices and up
    })
  }, [])

  // Function to detect device capabilities
  const detectDeviceCapabilities = useCallback(() => {
    // Check for touch support
    const hasTouch = 'ontouchstart' in window || 
                     navigator.maxTouchPoints > 0 || 
                     navigator.msMaxTouchPoints > 0
    
    // Get device pixel ratio for high-DPI displays
    const pixelRatio = window.devicePixelRatio || 1
    
    setDeviceInfo({
      isTouch: hasTouch,
      pixelRatio
    })
  }, [])

  // Function to update online status
  const updateOnlineStatus = useCallback(() => {
    setIsOnline(navigator.onLine)
  }, [])

  // Effect to set up resize and orientation change listeners
  useEffect(() => {
    // Set initial values
    updateDimensions()
    detectDeviceCapabilities()
    updateOnlineStatus()

    // Add resize event listener for viewport changes
    window.addEventListener('resize', updateDimensions)
    
    // Add orientation change listener for mobile devices
    window.addEventListener('orientationchange', () => {
      // Delay to allow orientation change to complete
      setTimeout(updateDimensions, 100)
    })
    
    // Add online/offline event listeners
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    // Cleanup function to remove event listeners
    return () => {
      window.removeEventListener('resize', updateDimensions)
      window.removeEventListener('orientationchange', updateDimensions)
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [updateDimensions, detectDeviceCapabilities, updateOnlineStatus])

  // Calculate derived responsive values
  const isMobile = dimensions.width < 768
  const isTablet = dimensions.width >= 768 && dimensions.width < 1024
  const isDesktop = dimensions.width >= 1024
  const orientation = dimensions.height > dimensions.width ? 'portrait' : 'landscape'

  return {
    // Viewport dimensions
    width: dimensions.width,
    height: dimensions.height,
    
    // Breakpoint matches
    ...breakpoints,
    
    // Device categories
    isMobile,
    isTablet,
    isDesktop,
    
    // Device properties
    orientation,
    isTouch: deviceInfo.isTouch,
    pixelRatio: deviceInfo.pixelRatio,
    
    // Network status
    isOnline
  }
}

// Custom hook for media query matching
export function useMediaQuery(query: string): boolean {
  // State to store media query match result
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    // Create media query list
    const mediaQuery = window.matchMedia(query)
    
    // Set initial value
    setMatches(mediaQuery.matches)
    
    // Create event handler for media query changes
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }
    
    // Add listener for media query changes
    mediaQuery.addListener(handleChange)
    
    // Cleanup function to remove listener
    return () => {
      mediaQuery.removeListener(handleChange)
    }
  }, [query])

  return matches
}

// Custom hook for specific breakpoint detection
export function useBreakpoint(breakpoint: keyof ResponsiveBreakpoints): boolean {
  const responsive = useResponsive()
  return responsive[breakpoint]
}

// Custom hook for mobile-first responsive design
export function useMobileFirst(): {
  isMobile: boolean
  isTabletUp: boolean
  isDesktopUp: boolean
  isLargeDesktopUp: boolean
} {
  const { sm, md, lg, xl } = useResponsive()
  
  return {
    isMobile: !md,           // Below medium breakpoint
    isTabletUp: md,          // Medium breakpoint and up
    isDesktopUp: lg,         // Large breakpoint and up
    isLargeDesktopUp: xl     // Extra large breakpoint and up
  }
}

// Utility function to get responsive value based on current breakpoint
export function useResponsiveValue<T>(values: {
  base: T
  sm?: T
  md?: T
  lg?: T
  xl?: T
  '2xl'?: T
}): T {
  const responsive = useResponsive()
  
  // Return the most specific value for current breakpoint
  if (responsive['2xl'] && values['2xl'] !== undefined) return values['2xl']
  if (responsive.xl && values.xl !== undefined) return values.xl
  if (responsive.lg && values.lg !== undefined) return values.lg
  if (responsive.md && values.md !== undefined) return values.md
  if (responsive.sm && values.sm !== undefined) return values.sm
  
  return values.base
}