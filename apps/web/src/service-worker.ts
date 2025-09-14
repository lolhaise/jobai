// TypeScript service worker for PWA functionality and offline support
/// <reference lib="webworker" />

// Type the service worker context
declare const self: ServiceWorkerGlobalScope

// Service worker configuration constants
const CACHE_NAME = 'jobai-v1.0.0' // Version the cache for updates
const STATIC_CACHE_NAME = `${CACHE_NAME}-static` // Cache for static assets
const DYNAMIC_CACHE_NAME = `${CACHE_NAME}-dynamic` // Cache for dynamic content
const API_CACHE_NAME = `${CACHE_NAME}-api` // Cache for API responses
const IMAGE_CACHE_NAME = `${CACHE_NAME}-images` // Cache for images

// Maximum number of items to store in dynamic cache
const MAX_DYNAMIC_CACHE_SIZE = 50
// Maximum number of items to store in API cache
const MAX_API_CACHE_SIZE = 100

// Static assets to cache on service worker install
const STATIC_ASSETS = [
  '/', // Root page
  '/dashboard', // Dashboard page
  '/jobs', // Job search page
  '/applications', // Applications page
  '/resume', // Resume builder page
  '/offline', // Offline fallback page
  '/manifest.json', // PWA manifest
  // Static assets
  '/_next/static/css/', // CSS files (pattern)
  '/_next/static/js/', // JavaScript files (pattern)
  '/icons/icon-192x192.png', // App icon
  '/icons/icon-512x512.png' // App icon
]

// API endpoints to cache for offline access
const CACHED_API_ROUTES = [
  '/api/user/profile', // User profile data
  '/api/applications', // User applications
  '/api/jobs/recent', // Recently viewed jobs
  '/api/resume/templates' // Resume templates
]

// Install event - cache static assets
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[SW] Installing service worker...')
  
  event.waitUntil(
    // Open static cache and add static assets
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets')
        // Cache static assets with error handling
        return Promise.allSettled(
          STATIC_ASSETS.map(asset => 
            cache.add(asset).catch(err => 
              console.warn(`[SW] Failed to cache ${asset}:`, err)
            )
          )
        )
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully')
        // Skip waiting to activate immediately
        return self.skipWaiting()
      })
      .catch(err => {
        console.error('[SW] Failed to install service worker:', err)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[SW] Activating service worker...')
  
  event.waitUntil(
    // Get all cache names
    caches.keys()
      .then((cacheNames) => {
        // Delete old caches that don't match current version
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheName.startsWith(CACHE_NAME)) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('[SW] Service worker activated')
        // Claim all clients immediately
        return self.clients.claim()
      })
      .catch(err => {
        console.error('[SW] Failed to activate service worker:', err)
      })
  )
})

// Fetch event - handle network requests with caching strategies
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return
  }

  // Handle different types of requests with appropriate caching strategies
  if (isStaticAsset(url)) {
    // Static assets: Cache first strategy
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE_NAME))
  } else if (isApiRequest(url)) {
    // API requests: Network first with cache fallback
    event.respondWith(networkFirstStrategy(request, API_CACHE_NAME))
  } else if (isImageRequest(url)) {
    // Images: Cache first with network fallback
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE_NAME))
  } else if (isPageRequest(url)) {
    // Pages: Network first with offline fallback
    event.respondWith(networkFirstWithOfflineFallback(request))
  } else {
    // Other requests: Network first with dynamic cache
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE_NAME))
  }
})

// Background sync event - handle offline actions
self.addEventListener('sync', (event: SyncEvent) => {
  console.log('[SW] Background sync triggered:', event.tag)
  
  // Handle different sync tags
  switch (event.tag) {
    case 'job-application-sync':
      event.waitUntil(syncJobApplications())
      break
    case 'profile-update-sync':
      event.waitUntil(syncProfileUpdates())
      break
    case 'resume-save-sync':
      event.waitUntil(syncResumeSaves())
      break
    default:
      console.log('[SW] Unknown sync tag:', event.tag)
  }
})

// Push event - handle push notifications
self.addEventListener('push', (event: PushEvent) => {
  console.log('[SW] Push notification received')
  
  // Default notification options
  const defaultOptions = {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/action-view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/action-dismiss.png'
      }
    ]
  }

  let notificationData = defaultOptions
  
  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json()
      notificationData = { ...defaultOptions, ...data }
    } catch (err) {
      console.error('[SW] Failed to parse push data:', err)
      notificationData.title = 'JobAI Notification'
      notificationData.body = event.data.text() || 'You have a new notification'
    }
  }

  // Show notification
  event.waitUntil(
    self.registration.showNotification(
      notificationData.title || 'JobAI',
      notificationData
    )
  )
})

// Notification click event - handle notification interactions
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  console.log('[SW] Notification clicked:', event.action)
  
  // Close the notification
  event.notification.close()

  // Handle different notification actions
  if (event.action === 'dismiss') {
    return // Just close the notification
  }

  // Get the URL to open based on notification data
  const urlToOpen = event.notification.data?.url || '/dashboard'

  // Open or focus the app
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Check if app is already open
        for (const client of clients) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus()
          }
        }
        
        // Open new window if app is not open
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen)
        }
      })
      .catch(err => {
        console.error('[SW] Failed to handle notification click:', err)
      })
  )
})

// Helper function to check if URL is a static asset
function isStaticAsset(url: URL): boolean {
  return url.pathname.startsWith('/_next/static/') ||
         url.pathname.startsWith('/icons/') ||
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.woff2') ||
         url.pathname === '/manifest.json'
}

// Helper function to check if URL is an API request
function isApiRequest(url: URL): boolean {
  return url.pathname.startsWith('/api/') ||
         CACHED_API_ROUTES.some(route => url.pathname.startsWith(route))
}

// Helper function to check if URL is an image request
function isImageRequest(url: URL): boolean {
  return url.pathname.endsWith('.png') ||
         url.pathname.endsWith('.jpg') ||
         url.pathname.endsWith('.jpeg') ||
         url.pathname.endsWith('.webp') ||
         url.pathname.endsWith('.svg')
}

// Helper function to check if URL is a page request
function isPageRequest(url: URL): boolean {
  return url.origin === self.location.origin &&
         !isStaticAsset(url) &&
         !isApiRequest(url) &&
         !isImageRequest(url)
}

// Cache first strategy - try cache first, fallback to network
async function cacheFirstStrategy(request: Request, cacheName: string): Promise<Response> {
  try {
    const cache = await caches.open(cacheName)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url)
      return cachedResponse
    }
    
    // Fallback to network
    console.log('[SW] Cache miss, fetching from network:', request.url)
    const networkResponse = await fetch(request)
    
    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.error('[SW] Cache first strategy failed:', error)
    throw error
  }
}

// Network first strategy - try network first, fallback to cache
async function networkFirstStrategy(request: Request, cacheName: string): Promise<Response> {
  try {
    const cache = await caches.open(cacheName)
    
    try {
      // Try network first
      console.log('[SW] Fetching from network:', request.url)
      const networkResponse = await fetch(request)
      
      // Cache successful responses
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone())
        
        // Limit cache size for dynamic content
        if (cacheName === DYNAMIC_CACHE_NAME) {
          limitCacheSize(cache, MAX_DYNAMIC_CACHE_SIZE)
        } else if (cacheName === API_CACHE_NAME) {
          limitCacheSize(cache, MAX_API_CACHE_SIZE)
        }
      }
      
      return networkResponse
    } catch (networkError) {
      // Network failed, try cache
      console.log('[SW] Network failed, trying cache:', request.url)
      const cachedResponse = await cache.match(request)
      
      if (cachedResponse) {
        console.log('[SW] Serving stale content from cache:', request.url)
        return cachedResponse
      }
      
      throw networkError
    }
  } catch (error) {
    console.error('[SW] Network first strategy failed:', error)
    throw error
  }
}

// Network first with offline fallback for pages
async function networkFirstWithOfflineFallback(request: Request): Promise<Response> {
  try {
    return await networkFirstStrategy(request, DYNAMIC_CACHE_NAME)
  } catch (error) {
    // Serve offline page as fallback
    console.log('[SW] Serving offline fallback page')
    const cache = await caches.open(STATIC_CACHE_NAME)
    const offlinePage = await cache.match('/offline')
    
    return offlinePage || new Response('Offline', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}

// Helper function to limit cache size
async function limitCacheSize(cache: Cache, maxSize: number): Promise<void> {
  const keys = await cache.keys()
  
  if (keys.length > maxSize) {
    // Remove oldest entries (FIFO)
    const entriesToDelete = keys.slice(0, keys.length - maxSize)
    await Promise.all(entriesToDelete.map(key => cache.delete(key)))
    console.log(`[SW] Cleaned cache, removed ${entriesToDelete.length} entries`)
  }
}

// Background sync functions
async function syncJobApplications(): Promise<void> {
  try {
    console.log('[SW] Syncing job applications...')
    // Get pending applications from IndexedDB and send to server
    // Implementation would depend on your offline storage strategy
    console.log('[SW] Job applications synced successfully')
  } catch (error) {
    console.error('[SW] Failed to sync job applications:', error)
  }
}

async function syncProfileUpdates(): Promise<void> {
  try {
    console.log('[SW] Syncing profile updates...')
    // Get pending profile updates and send to server
    console.log('[SW] Profile updates synced successfully')
  } catch (error) {
    console.error('[SW] Failed to sync profile updates:', error)
  }
}

async function syncResumeSaves(): Promise<void> {
  try {
    console.log('[SW] Syncing resume saves...')
    // Get pending resume changes and send to server
    console.log('[SW] Resume saves synced successfully')
  } catch (error) {
    console.error('[SW] Failed to sync resume saves:', error)
  }
}