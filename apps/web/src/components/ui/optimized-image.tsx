'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// Interface for optimized image props
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  fill?: boolean;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  onLoad?: () => void;
  onError?: () => void;
  lazy?: boolean;
  threshold?: number;
}

/**
 * OptimizedImage component with lazy loading and performance features
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 75,
  placeholder = 'blur',
  blurDataURL,
  sizes,
  fill = false,
  objectFit = 'cover',
  onLoad,
  onError,
  lazy = true,
  threshold = 0.1,
}: OptimizedImageProps) {
  const [isInView, setIsInView] = useState(!lazy);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);

  // Default blur data URL for placeholder
  const defaultBlurDataURL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold,
        rootMargin: '50px',
      }
    );

    if (imageRef.current) {
      observer.observe(imageRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [lazy, priority, threshold]);

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  // Handle image error
  const handleError = () => {
    setError(true);
    onError?.();
  };

  // Error fallback
  if (error) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-100 dark:bg-gray-800',
          className
        )}
        style={{ width, height }}
      >
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
    );
  }

  return (
    <div
      ref={imageRef}
      className={cn('relative overflow-hidden', className)}
      style={!fill ? { width, height } : undefined}
    >
      {isInView ? (
        <>
          {/* Loading skeleton */}
          {!isLoaded && (
            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
          )}
          
          {/* Optimized image */}
          <Image
            src={src}
            alt={alt}
            width={!fill ? width : undefined}
            height={!fill ? height : undefined}
            fill={fill}
            quality={quality}
            priority={priority}
            placeholder={placeholder}
            blurDataURL={blurDataURL || defaultBlurDataURL}
            sizes={sizes}
            style={{ objectFit }}
            onLoad={handleLoad}
            onError={handleError}
            className={cn(
              'transition-opacity duration-300',
              isLoaded ? 'opacity-100' : 'opacity-0'
            )}
          />
        </>
      ) : (
        // Placeholder while not in view
        <div className="w-full h-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
      )}
    </div>
  );
}

/**
 * Avatar image component with optimized loading
 */
export function OptimizedAvatar({
  src,
  alt,
  size = 40,
  className,
}: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn('rounded-full', className)}
      priority={false}
      quality={90}
    />
  );
}

/**
 * Background image component with lazy loading
 */
export function OptimizedBackgroundImage({
  src,
  alt,
  className,
  children,
  overlay = true,
}: {
  src: string;
  alt: string;
  className?: string;
  children?: React.ReactNode;
  overlay?: boolean;
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        quality={85}
        onLoad={() => setIsLoaded(true)}
        className="absolute inset-0"
      />
      
      {/* Overlay */}
      {overlay && (
        <div className="absolute inset-0 bg-black/50" />
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

/**
 * Gallery image component with progressive loading
 */
export function OptimizedGalleryImage({
  src,
  alt,
  thumbnailSrc,
  className,
  onClick,
}: {
  src: string;
  alt: string;
  thumbnailSrc?: string;
  className?: string;
  onClick?: () => void;
}) {
  const [showFullImage, setShowFullImage] = useState(false);

  return (
    <button
      onClick={onClick}
      className={cn('relative cursor-pointer group', className)}
    >
      {/* Thumbnail */}
      <OptimizedImage
        src={thumbnailSrc || src}
        alt={alt}
        fill
        quality={thumbnailSrc ? 60 : 75}
        className="transition-transform group-hover:scale-105"
      />
      
      {/* Full image (loaded on hover or click) */}
      {showFullImage && (
        <OptimizedImage
          src={src}
          alt={alt}
          fill
          quality={90}
          priority
          className="absolute inset-0 z-10"
        />
      )}
      
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
    </button>
  );
}

/**
 * Hook for preloading images
 */
export function useImagePreloader(urls: string[]) {
  useEffect(() => {
    urls.forEach((url) => {
      const img = new window.Image();
      img.src = url;
    });
  }, [urls]);
}

/**
 * Responsive image with art direction
 */
export function ResponsiveImage({
  desktop,
  tablet,
  mobile,
  alt,
  className,
}: {
  desktop: string;
  tablet?: string;
  mobile: string;
  alt: string;
  className?: string;
}) {
  const [currentSrc, setCurrentSrc] = useState(desktop);

  useEffect(() => {
    const updateImage = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setCurrentSrc(mobile);
      } else if (width < 1024 && tablet) {
        setCurrentSrc(tablet);
      } else {
        setCurrentSrc(desktop);
      }
    };

    updateImage();
    window.addEventListener('resize', updateImage);
    return () => window.removeEventListener('resize', updateImage);
  }, [desktop, tablet, mobile]);

  return (
    <OptimizedImage
      src={currentSrc}
      alt={alt}
      fill
      className={className}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
    />
  );
}