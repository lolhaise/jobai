// Push notifications utility for JobAI PWA
// Handles subscription management, permission requests, and notification display

// Type definitions for push notifications
export interface NotificationPayload {
  title: string // Notification title
  body: string // Notification body text
  icon?: string // Icon URL
  badge?: string // Badge icon URL
  image?: string // Large image URL
  tag?: string // Notification tag for grouping
  data?: any // Custom data payload
  actions?: NotificationAction[] // Action buttons
  requireInteraction?: boolean // Whether notification stays visible
  silent?: boolean // Whether to play sound
  vibrate?: number[] // Vibration pattern
  timestamp?: number // Notification timestamp
}

// Interface for notification action buttons
export interface NotificationAction {
  action: string // Action identifier
  title: string // Button text
  icon?: string // Button icon
}

// Interface for push subscription data
export interface PushSubscriptionData {
  endpoint: string // Push service endpoint
  keys: {
    p256dh: string // Public key
    auth: string // Authentication secret
  }
  userId?: string // Associated user ID
  deviceId?: string // Device identifier
}

// Enum for notification types
export enum NotificationType {
  JOB_MATCH = 'job_match',
  APPLICATION_UPDATE = 'application_update',
  DEADLINE_REMINDER = 'deadline_reminder',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  PROFILE_VIEW = 'profile_view',
  SYSTEM_ALERT = 'system_alert'
}

// Class to manage push notifications
export class PushNotificationManager {
  private vapidPublicKey: string // VAPID public key for push service
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null

  constructor(vapidPublicKey: string) {
    this.vapidPublicKey = vapidPublicKey // Store VAPID key for subscription
  }

  // Initialize push notifications system
  async initialize(): Promise<void> {
    try {
      // Check if browser supports service workers and push notifications
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('[Push] Browser does not support push notifications')
        return
      }

      // Register service worker if not already registered
      if (!this.serviceWorkerRegistration) {
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js')
        console.log('[Push] Service worker registered successfully')
      }

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready
      console.log('[Push] Push notification manager initialized')
    } catch (error) {
      console.error('[Push] Failed to initialize push notifications:', error)
      throw error
    }
  }

  // Request notification permission from user
  async requestPermission(): Promise<NotificationPermission> {
    try {
      // Check if permission is already granted
      if ('Notification' in window && Notification.permission === 'granted') {
        return 'granted'
      }

      // Request permission using modern API
      if ('Notification' in window && Notification.requestPermission) {
        const permission = await Notification.requestPermission()
        console.log('[Push] Notification permission:', permission)
        return permission
      }

      console.warn('[Push] Notification API not supported')
      return 'denied'
    } catch (error) {
      console.error('[Push] Failed to request notification permission:', error)
      return 'denied'
    }
  }

  // Check current notification permission status
  getPermissionStatus(): NotificationPermission {
    if ('Notification' in window) {
      return Notification.permission
    }
    return 'denied'
  }

  // Subscribe user to push notifications
  async subscribe(): Promise<PushSubscriptionData | null> {
    try {
      // Ensure service worker is available
      if (!this.serviceWorkerRegistration) {
        await this.initialize()
      }

      // Check permission before subscribing
      const permission = await this.requestPermission()
      if (permission !== 'granted') {
        console.log('[Push] Permission not granted, cannot subscribe')
        return null
      }

      // Get existing subscription or create new one
      let subscription = await this.serviceWorkerRegistration!.pushManager.getSubscription()
      
      if (!subscription) {
        // Create new subscription with VAPID key
        subscription = await this.serviceWorkerRegistration!.pushManager.subscribe({
          userVisibleOnly: true, // Only show user-visible notifications
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
        })
        console.log('[Push] Created new push subscription')
      } else {
        console.log('[Push] Using existing push subscription')
      }

      // Convert subscription to our format
      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
        }
      }

      // Store subscription locally for future reference
      this.storeSubscriptionLocally(subscriptionData)

      return subscriptionData
    } catch (error) {
      console.error('[Push] Failed to subscribe to push notifications:', error)
      return null
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(): Promise<boolean> {
    try {
      if (!this.serviceWorkerRegistration) {
        console.log('[Push] No service worker registration found')
        return true
      }

      // Get current subscription
      const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription()
      
      if (subscription) {
        // Unsubscribe from push service
        const success = await subscription.unsubscribe()
        if (success) {
          console.log('[Push] Successfully unsubscribed from push notifications')
          this.removeSubscriptionLocally() // Remove from local storage
        }
        return success
      }

      return true // No subscription to remove
    } catch (error) {
      console.error('[Push] Failed to unsubscribe from push notifications:', error)
      return false
    }
  }

  // Get current subscription status
  async getSubscription(): Promise<PushSubscriptionData | null> {
    try {
      if (!this.serviceWorkerRegistration) {
        return null
      }

      const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription()
      
      if (!subscription) {
        return null
      }

      // Convert to our format
      return {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
        }
      }
    } catch (error) {
      console.error('[Push] Failed to get subscription:', error)
      return null
    }
  }

  // Show local notification (fallback for when push is not available)
  async showLocalNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Check permission
      if (this.getPermissionStatus() !== 'granted') {
        console.log('[Push] Permission not granted for local notification')
        return
      }

      // Show notification using Notification API
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: payload.badge || '/icons/badge-72x72.png',
        image: payload.image,
        tag: payload.tag,
        data: payload.data,
        requireInteraction: payload.requireInteraction || false,
        silent: payload.silent || false,
        vibrate: payload.vibrate || [200, 100, 200],
        timestamp: payload.timestamp || Date.now()
      })

      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault() // Prevent default browser behavior
        notification.close()
        
        // Handle click based on notification data
        if (payload.data?.url) {
          window.open(payload.data.url, '_blank')
        }
      }

      // Auto-close notification after delay (optional)
      if (!payload.requireInteraction) {
        setTimeout(() => notification.close(), 5000)
      }

      console.log('[Push] Local notification displayed')
    } catch (error) {
      console.error('[Push] Failed to show local notification:', error)
    }
  }

  // Register for specific notification types
  async registerForNotifications(types: NotificationType[]): Promise<boolean> {
    try {
      const subscription = await this.subscribe()
      
      if (!subscription) {
        console.log('[Push] Could not subscribe, registration failed')
        return false
      }

      // Send subscription and preferences to server
      const response = await fetch('/api/notifications/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          types,
          timestamp: Date.now()
        })
      })

      if (!response.ok) {
        throw new Error(`Registration failed: ${response.statusText}`)
      }

      console.log('[Push] Successfully registered for notification types:', types)
      return true
    } catch (error) {
      console.error('[Push] Failed to register for notifications:', error)
      return false
    }
  }

  // Update notification preferences
  async updateNotificationPreferences(types: NotificationType[]): Promise<boolean> {
    try {
      const subscription = await this.getSubscription()
      
      if (!subscription) {
        console.log('[Push] No active subscription found')
        return false
      }

      // Update preferences on server
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          types,
          timestamp: Date.now()
        })
      })

      if (!response.ok) {
        throw new Error(`Update failed: ${response.statusText}`)
      }

      console.log('[Push] Notification preferences updated:', types)
      return true
    } catch (error) {
      console.error('[Push] Failed to update notification preferences:', error)
      return false
    }
  }

  // Test push notification functionality
  async testNotification(): Promise<void> {
    const testPayload: NotificationPayload = {
      title: 'JobAI Test Notification',
      body: 'Push notifications are working correctly!',
      icon: '/icons/icon-192x192.png',
      tag: 'test-notification',
      data: { type: 'test', url: '/dashboard' },
      actions: [
        { action: 'view', title: 'View Dashboard' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    }

    await this.showLocalNotification(testPayload)
  }

  // Convert VAPID key from base64 to Uint8Array
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    
    return outputArray
  }

  // Store subscription data in local storage
  private storeSubscriptionLocally(subscription: PushSubscriptionData): void {
    try {
      localStorage.setItem('push-subscription', JSON.stringify(subscription))
    } catch (error) {
      console.warn('[Push] Failed to store subscription locally:', error)
    }
  }

  // Remove subscription data from local storage
  private removeSubscriptionLocally(): void {
    try {
      localStorage.removeItem('push-subscription')
    } catch (error) {
      console.warn('[Push] Failed to remove subscription locally:', error)
    }
  }
}

// Default notification configurations for different types
export const DEFAULT_NOTIFICATIONS: Record<NotificationType, Partial<NotificationPayload>> = {
  [NotificationType.JOB_MATCH]: {
    icon: '/icons/job-match.png',
    badge: '/icons/badge-job.png',
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'View Job' },
      { action: 'save', title: 'Save for Later' }
    ]
  },
  [NotificationType.APPLICATION_UPDATE]: {
    icon: '/icons/application-update.png',
    badge: '/icons/badge-app.png',
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'View Update' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  },
  [NotificationType.DEADLINE_REMINDER]: {
    icon: '/icons/deadline.png',
    badge: '/icons/badge-warning.png',
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300],
    actions: [
      { action: 'view', title: 'View Application' },
      { action: 'snooze', title: 'Remind Later' }
    ]
  },
  [NotificationType.INTERVIEW_SCHEDULED]: {
    icon: '/icons/interview.png',
    badge: '/icons/badge-calendar.png',
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'calendar', title: 'Add to Calendar' }
    ]
  },
  [NotificationType.PROFILE_VIEW]: {
    icon: '/icons/profile-view.png',
    badge: '/icons/badge-eye.png',
    requireInteraction: false
  },
  [NotificationType.SYSTEM_ALERT]: {
    icon: '/icons/system-alert.png',
    badge: '/icons/badge-warning.png',
    requireInteraction: true,
    vibrate: [500, 200, 500]
  }
}

// Utility function to create notification manager instance
export function createPushNotificationManager(vapidPublicKey: string): PushNotificationManager {
  return new PushNotificationManager(vapidPublicKey)
}

// Utility function to check if push notifications are supported
export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 
         'PushManager' in window && 
         'Notification' in window
}