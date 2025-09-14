import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { AuthSessionProvider } from '@/components/providers/session-provider'
import { Toaster } from '@/components/ui/toaster'
import { MobileLayoutProvider } from '@/components/providers/mobile-layout-provider'
import './globals.css'

// Load Inter font with Latin subset for optimal performance
const inter = Inter({ subsets: ['latin'] })

// PWA and SEO metadata configuration
export const metadata: Metadata = {
  title: {
    default: 'JobAI - Automate Your Job Search',
    template: '%s | JobAI'
  },
  description: 'AI-powered job application automation platform that helps you find, apply, and track job opportunities efficiently.',
  keywords: ['job search', 'AI', 'automation', 'resume builder', 'career', 'employment'],
  authors: [{ name: 'JobAI Team' }],
  creator: 'JobAI',
  publisher: 'JobAI',
  formatDetection: {
    email: false,
    address: false,
    telephone: false
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://jobai.app'),
  alternates: {
    canonical: '/'
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'JobAI - Automate Your Job Search',
    description: 'AI-powered job application automation platform',
    siteName: 'JobAI',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'JobAI - AI-powered job search automation'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JobAI - Automate Your Job Search',
    description: 'AI-powered job application automation platform',
    images: ['/twitter-image.png']
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ],
    shortcut: '/icons/favicon.ico'
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'JobAI',
    startupImage: [
      {
        url: '/splash/apple-splash-2048-2732.png',
        media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)'
      },
      {
        url: '/splash/apple-splash-1668-2388.png',
        media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)'
      },
      {
        url: '/splash/apple-splash-1536-2048.png',
        media: '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)'
      },
      {
        url: '/splash/apple-splash-1125-2436.png',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)'
      }
    ]
  }
}

// Viewport configuration for responsive design and PWA
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3b82f6' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' }
  ],
  colorScheme: 'light dark',
  viewportFit: 'cover'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preload critical resources for better performance */}
        <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        
        {/* Additional PWA meta tags for better mobile experience */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="JobAI" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Prevent zoom on input focus for iOS */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" />
        
        {/* Service worker registration script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('[SW] Service worker registered:', registration.scope);
                    })
                    .catch(function(error) {
                      console.log('[SW] Service worker registration failed:', error);
                    });
                });
              }
            `
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <AuthSessionProvider>
          {/* Mobile layout provider wraps the app with mobile-specific features */}
          <MobileLayoutProvider>
            {children}
          </MobileLayoutProvider>
          {/* Toast notifications for user feedback */}
          <Toaster />
        </AuthSessionProvider>
      </body>
    </html>
  )
}