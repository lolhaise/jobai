// Notification system components
// Built with Sonner for toast notifications and custom in-app notifications

import * as React from "react"
import { toast } from "sonner"
import { Bell, Check, Info, AlertCircle, X, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Notification types
export type NotificationType = "info" | "success" | "warning" | "error" | "default"

// Notification interface
export interface Notification {
  id: string
  type: NotificationType
  title: string
  description?: string
  timestamp: Date
  read: boolean
  action?: {
    label: string
    onClick: () => void
  }
  persistent?: boolean
}

// Toast notification helper functions
export const notify = {
  success: (message: string, description?: string) => {
    toast.success(message, {
      description,
      duration: 4000,
    })
  },
  error: (message: string, description?: string) => {
    toast.error(message, {
      description,
      duration: 5000,
    })
  },
  info: (message: string, description?: string) => {
    toast.info(message, {
      description,
      duration: 4000,
    })
  },
  warning: (message: string, description?: string) => {
    toast.warning(message, {
      description,
      duration: 4000,
    })
  },
  loading: (message: string, description?: string) => {
    return toast.loading(message, {
      description,
    })
  },
  custom: (content: React.ReactNode) => {
    toast.custom(() => content)
  },
  promise: <T,>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    }
  ) => {
    return toast.promise(promise, {
      loading,
      success,
      error,
    })
  },
}

// Get icon for notification type
const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case "success":
      return <Check className="h-4 w-4" />
    case "error":
      return <X className="h-4 w-4" />
    case "warning":
      return <AlertTriangle className="h-4 w-4" />
    case "info":
      return <Info className="h-4 w-4" />
    default:
      return <Bell className="h-4 w-4" />
  }
}

// Get color class for notification type
const getNotificationColor = (type: NotificationType) => {
  switch (type) {
    case "success":
      return "text-green-600 bg-green-50 border-green-200"
    case "error":
      return "text-red-600 bg-red-50 border-red-200"
    case "warning":
      return "text-yellow-600 bg-yellow-50 border-yellow-200"
    case "info":
      return "text-blue-600 bg-blue-50 border-blue-200"
    default:
      return "text-gray-600 bg-gray-50 border-gray-200"
  }
}

// Notification item component
interface NotificationItemProps {
  notification: Notification
  onRead?: (id: string) => void
  onDismiss?: (id: string) => void
  onAction?: () => void
}

export function NotificationItem({
  notification,
  onRead,
  onDismiss,
  onAction,
}: NotificationItemProps) {
  const colorClass = getNotificationColor(notification.type)

  return (
    <div
      className={cn(
        "relative rounded-lg border p-4 transition-all",
        colorClass,
        !notification.read && "shadow-sm",
        notification.read && "opacity-75"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "rounded-full p-2",
            notification.type === "success" && "bg-green-100",
            notification.type === "error" && "bg-red-100",
            notification.type === "warning" && "bg-yellow-100",
            notification.type === "info" && "bg-blue-100",
            notification.type === "default" && "bg-gray-100"
          )}
        >
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <p className="font-medium">{notification.title}</p>
            {!notification.read && (
              <Badge variant="default" className="h-5 text-xs">
                New
              </Badge>
            )}
          </div>
          {notification.description && (
            <p className="text-sm opacity-90">{notification.description}</p>
          )}
          <p className="text-xs opacity-75">
            {new Date(notification.timestamp).toLocaleString()}
          </p>
          {notification.action && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => {
                onAction?.()
                notification.action?.onClick()
              }}
            >
              {notification.action.label}
            </Button>
          )}
        </div>
        <div className="flex gap-1">
          {!notification.read && onRead && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => onRead(notification.id)}
              title="Mark as read"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          {!notification.persistent && onDismiss && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => onDismiss(notification.id)}
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// Notification center component
interface NotificationCenterProps {
  notifications: Notification[]
  onRead?: (id: string) => void
  onDismiss?: (id: string) => void
  onClearAll?: () => void
  onMarkAllRead?: () => void
}

export function NotificationCenter({
  notifications,
  onRead,
  onDismiss,
  onClearAll,
  onMarkAllRead,
}: NotificationCenterProps) {
  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
                : "All caught up!"}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && onMarkAllRead && (
              <Button size="sm" variant="outline" onClick={onMarkAllRead}>
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && onClearAll && (
              <Button size="sm" variant="outline" onClick={onClearAll}>
                Clear all
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Bell className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-2">No notifications</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={onRead}
                onDismiss={onDismiss}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Notification bell with badge
interface NotificationBellProps {
  count?: number
  onClick?: () => void
  className?: string
}

export function NotificationBell({
  count = 0,
  onClick,
  className,
}: NotificationBellProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("relative", className)}
      onClick={onClick}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Button>
  )
}

// Alert banner component
interface AlertBannerProps {
  type?: NotificationType
  title: string
  description?: string
  closable?: boolean
  onClose?: () => void
  className?: string
}

export function AlertBanner({
  type = "info",
  title,
  description,
  closable = true,
  onClose,
  className,
}: AlertBannerProps) {
  const [isVisible, setIsVisible] = React.useState(true)

  if (!isVisible) return null

  const colorClass = getNotificationColor(type)

  return (
    <div
      className={cn(
        "relative rounded-lg border p-4",
        colorClass,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "rounded-full p-2",
            type === "success" && "bg-green-100",
            type === "error" && "bg-red-100",
            type === "warning" && "bg-yellow-100",
            type === "info" && "bg-blue-100",
            type === "default" && "bg-gray-100"
          )}
        >
          {getNotificationIcon(type)}
        </div>
        <div className="flex-1">
          <p className="font-medium">{title}</p>
          {description && (
            <p className="mt-1 text-sm opacity-90">{description}</p>
          )}
        </div>
        {closable && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => {
              setIsVisible(false)
              onClose?.()
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

// Notification provider hook
export function useNotifications() {
  const [notifications, setNotifications] = React.useState<Notification[]>([])

  const addNotification = React.useCallback((notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false,
    }
    setNotifications((prev) => [newNotification, ...prev])
    return newNotification.id
  }, [])

  const markAsRead = React.useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  const markAllAsRead = React.useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const dismiss = React.useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const clearAll = React.useCallback(() => {
    setNotifications([])
  }, [])

  return {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    dismiss,
    clearAll,
    unreadCount: notifications.filter((n) => !n.read).length,
  }
}