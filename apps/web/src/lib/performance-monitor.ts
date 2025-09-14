/**
 * Performance monitoring utilities for tracking web vitals and metrics
 */

// Web Vitals metrics
export interface WebVitals {
  FCP?: number;  // First Contentful Paint
  LCP?: number;  // Largest Contentful Paint
  FID?: number;  // First Input Delay
  CLS?: number;  // Cumulative Layout Shift
  TTFB?: number; // Time to First Byte
  INP?: number;  // Interaction to Next Paint
}

// Custom performance metrics
export interface CustomMetrics {
  apiResponseTime?: number;
  cacheHitRate?: number;
  bundleSize?: number;
  imageLoadTime?: number;
  timeToInteractive?: number;
}

class PerformanceMonitor {
  private metrics: WebVitals & CustomMetrics = {};
  private observers: Map<string, PerformanceObserver> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers();
      this.trackWebVitals();
    }
  }

  /**
   * Initialize performance observers
   */
  private initializeObservers() {
    // Track Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.LCP = lastEntry.renderTime || lastEntry.loadTime;
          this.reportMetric('LCP', this.metrics.LCP);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('lcp', lcpObserver);
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      // Track First Input Delay
      try {
        const fidObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry: any) => {
            if (entry.processingStart) {
              this.metrics.FID = entry.processingStart - entry.startTime;
              this.reportMetric('FID', this.metrics.FID);
            }
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.set('fid', fidObserver);
      } catch (e) {
        console.warn('FID observer not supported');
      }

      // Track Cumulative Layout Shift
      try {
        let clsValue = 0;
        let clsEntries: PerformanceEntry[] = [];
        
        const clsObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              clsEntries.push(entry);
            }
          });
          this.metrics.CLS = clsValue;
          this.reportMetric('CLS', this.metrics.CLS);
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('cls', clsObserver);
      } catch (e) {
        console.warn('CLS observer not supported');
      }
    }
  }

  /**
   * Track Core Web Vitals
   */
  private trackWebVitals() {
    // Time to First Byte
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      this.metrics.TTFB = timing.responseStart - timing.navigationStart;
      this.reportMetric('TTFB', this.metrics.TTFB);
    }

    // First Contentful Paint
    if (window.performance && window.performance.getEntriesByType) {
      const paintEntries = window.performance.getEntriesByType('paint');
      paintEntries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.FCP = entry.startTime;
          this.reportMetric('FCP', this.metrics.FCP);
        }
      });
    }
  }

  /**
   * Track custom metric
   */
  public trackMetric(name: keyof CustomMetrics, value: number) {
    this.metrics[name] = value;
    this.reportMetric(name, value);
  }

  /**
   * Track API response time
   */
  public trackApiCall(url: string, startTime: number) {
    const duration = Date.now() - startTime;
    this.trackMetric('apiResponseTime', duration);
    
    // Log slow API calls
    if (duration > 1000) {
      console.warn(`Slow API call to ${url}: ${duration}ms`);
    }
  }

  /**
   * Track image load time
   */
  public trackImageLoad(src: string, startTime: number) {
    const duration = Date.now() - startTime;
    this.trackMetric('imageLoadTime', duration);
    
    // Log slow image loads
    if (duration > 500) {
      console.warn(`Slow image load for ${src}: ${duration}ms`);
    }
  }

  /**
   * Report metric to analytics service
   */
  private reportMetric(name: string, value: number) {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${value}`);
    }

    // Send to analytics service (Google Analytics, Sentry, etc.)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'performance', {
        metric_name: name,
        value: Math.round(value),
      });
    }
  }

  /**
   * Get all metrics
   */
  public getMetrics(): WebVitals & CustomMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance score (0-100)
   */
  public getPerformanceScore(): number {
    const scores = [];
    
    // LCP scoring (< 2.5s = good, < 4s = needs improvement)
    if (this.metrics.LCP !== undefined) {
      if (this.metrics.LCP < 2500) scores.push(100);
      else if (this.metrics.LCP < 4000) scores.push(50);
      else scores.push(0);
    }
    
    // FID scoring (< 100ms = good, < 300ms = needs improvement)
    if (this.metrics.FID !== undefined) {
      if (this.metrics.FID < 100) scores.push(100);
      else if (this.metrics.FID < 300) scores.push(50);
      else scores.push(0);
    }
    
    // CLS scoring (< 0.1 = good, < 0.25 = needs improvement)
    if (this.metrics.CLS !== undefined) {
      if (this.metrics.CLS < 0.1) scores.push(100);
      else if (this.metrics.CLS < 0.25) scores.push(50);
      else scores.push(0);
    }
    
    // TTFB scoring (< 600ms = good, < 1500ms = needs improvement)
    if (this.metrics.TTFB !== undefined) {
      if (this.metrics.TTFB < 600) scores.push(100);
      else if (this.metrics.TTFB < 1500) scores.push(50);
      else scores.push(0);
    }
    
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  /**
   * Clean up observers
   */
  public destroy() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers.clear();
  }
}

// Singleton instance
let performanceMonitor: PerformanceMonitor | null = null;

/**
 * Get performance monitor instance
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitor && typeof window !== 'undefined') {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor!;
}

/**
 * Hook for tracking component render performance
 */
export function useRenderPerformance(componentName: string) {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const startTime = performance.now();
    
    // Log render time on unmount
    return () => {
      const renderTime = performance.now() - startTime;
      if (renderTime > 16.67) { // More than one frame (60fps)
        console.warn(`[Performance] ${componentName} rendered in ${renderTime.toFixed(2)}ms`);
      }
    };
  }
  
  return () => {};
}

/**
 * Utility to measure async operation performance
 */
export async function measureAsync<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await operation();
    const duration = performance.now() - startTime;
    
    if (typeof window !== 'undefined') {
      getPerformanceMonitor()?.trackMetric('apiResponseTime', duration);
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name} completed in ${duration.toFixed(2)}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`[Performance] ${name} failed after ${duration.toFixed(2)}ms`, error);
    throw error;
  }
}

/**
 * Debounce function with performance tracking
 */
export function debounceWithTracking<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  name: string
): T {
  let timeout: NodeJS.Timeout | null = null;
  let callCount = 0;
  
  return ((...args: Parameters<T>) => {
    callCount++;
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      if (process.env.NODE_ENV === 'development' && callCount > 5) {
        console.warn(`[Performance] ${name} debounced ${callCount} times`);
      }
      callCount = 0;
      func(...args);
    }, wait);
  }) as T;
}

/**
 * Request idle callback with fallback
 */
export function requestIdleCallbackShim(
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
): number {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  }
  
  // Fallback to setTimeout
  const timeout = options?.timeout || 1000;
  const start = Date.now();
  
  return window.setTimeout(() => {
    callback({
      didTimeout: Date.now() - start > timeout,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
    } as IdleDeadline);
  }, 1) as unknown as number;
}

export default performanceMonitor;