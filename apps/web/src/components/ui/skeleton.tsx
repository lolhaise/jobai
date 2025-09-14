// Skeleton components for loading states
// Provides various skeleton patterns for different UI elements

import { cn } from "@/lib/utils"
import * as React from "react"

// Base skeleton component
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      {...props}
    />
  )
}

// Skeleton for text lines
function SkeletonText({
  lines = 3,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { lines?: number }) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 && "w-3/4"
          )}
        />
      ))}
    </div>
  )
}

// Skeleton for cards
function SkeletonCard({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-6 shadow-sm",
        className
      )}
      {...props}
    >
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/3" />
        <SkeletonText lines={2} />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </div>
  )
}

// Skeleton for table rows
function SkeletonTable({
  rows = 5,
  cols = 4,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  rows?: number
  cols?: number
}) {
  return (
    <div className={cn("w-full", className)} {...props}>
      <div className="rounded-md border">
        <div className="border-b bg-muted/50 p-4">
          <div className="flex gap-4">
            {Array.from({ length: cols }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
        </div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="border-b p-4 last:border-0">
            <div className="flex gap-4">
              {Array.from({ length: cols }).map((_, colIndex) => (
                <Skeleton
                  key={colIndex}
                  className={cn(
                    "h-4 flex-1",
                    colIndex === 0 && "max-w-[200px]"
                  )}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Skeleton for form fields
function SkeletonForm({
  fields = 3,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { fields?: number }) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-32" />
    </div>
  )
}

// Skeleton for avatars
function SkeletonAvatar({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton
      className={cn("h-10 w-10 rounded-full", className)}
      {...props}
    />
  )
}

// Skeleton for badges
function SkeletonBadge({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton
      className={cn("h-5 w-16 rounded-full", className)}
      {...props}
    />
  )
}

// Skeleton for list items
function SkeletonList({
  items = 3,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { items?: number }) {
  return (
    <div className={cn("space-y-3", className)} {...props}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <SkeletonAvatar />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Skeleton for charts
function SkeletonChart({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-6 shadow-sm",
        className
      )}
      {...props}
    >
      <div className="space-y-4">
        <div>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-[350px] w-full" />
      </div>
    </div>
  )
}

// Loading spinner component
function Spinner({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent",
        className
      )}
      {...props}
    />
  )
}

// Loading dots component
function LoadingDots({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex space-x-1", className)} {...props}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-2 w-2 animate-pulse rounded-full bg-primary"
          style={{
            animationDelay: `${i * 150}ms`,
          }}
        />
      ))}
    </div>
  )
}

// Page loading component
function PageLoading({
  text = "Loading...",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { text?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[400px] flex-col items-center justify-center space-y-4",
        className
      )}
      {...props}
    >
      <Spinner className="h-8 w-8" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonForm,
  SkeletonAvatar,
  SkeletonBadge,
  SkeletonList,
  SkeletonChart,
  Spinner,
  LoadingDots,
  PageLoading,
}