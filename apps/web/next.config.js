/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  // Transpile packages for monorepo compatibility
  transpilePackages: ['@jobai/shared', '@jobai/ui'],
  
  // Enable SWC minification for better performance
  swcMinify: true,
  
  // CDN configuration for static assets
  assetPrefix: process.env.NEXT_PUBLIC_CDN_URL || '',
  
  // PWA configuration
  // Enable experimental features for PWA support
  experimental: {
    // Enable app directory (Next.js 13+ feature)
    appDir: true,
    // Enable CSS optimization
    optimizeCss: true,
    // Enable scroll restoration
    scrollRestoration: true,
  },
  
  // Production compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Headers configuration for PWA, security, and caching
  async headers() {
    return [
      {
        // Apply headers to all routes
        source: '/(.*)',
        headers: [
          {
            // Enable service worker scope
            key: 'Service-Worker-Allowed',
            value: '/'
          },
          {
            // Security headers for PWA
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            // Enable HTTPS for secure context (required for PWA)
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            // DNS prefetch for performance
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            // Frame options for security
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            // XSS protection
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            // Referrer policy
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      },
      // Cache static assets for 1 year
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache images for 1 year
      {
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache fonts for 1 year
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache JavaScript and CSS for 1 year
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Specific headers for service worker
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate'
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/'
          }
        ]
      },
      {
        // Headers for manifest file
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json'
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ]
  },
  
  // API routes rewrite for backend communication
  async rewrites() {
    return [
      {
        // Proxy API requests to backend server
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/:path*`,
      },
    ];
  },
  
  // Webpack configuration for optimization and code splitting
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Only run on client-side builds
    if (!isServer) {
      // Copy service worker to public directory during build
      config.plugins.push(
        new webpack.DefinePlugin({
          // Define build-time constants for service worker
          __BUILD_ID__: JSON.stringify(buildId),
          __DEV__: JSON.stringify(dev)
        })
      )
      
      // Production optimizations
      if (!dev) {
        // Enhanced code splitting configuration
        config.optimization = {
          ...config.optimization,
          usedExports: true,
          sideEffects: false,
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              default: false,
              vendors: false,
              // React libraries chunk
              react: {
                name: 'react',
                test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                chunks: 'all',
                priority: 40,
                reuseExistingChunk: true,
                enforce: true,
              },
              // UI components and animation libraries
              ui: {
                name: 'ui',
                test: /[\\/]node_modules[\\/](@radix-ui|framer-motion|class-variance-authority|clsx)[\\/]/,
                chunks: 'all',
                priority: 35,
              },
              // Data visualization libraries
              charts: {
                name: 'charts',
                test: /[\\/]node_modules[\\/](recharts|d3)[\\/]/,
                chunks: 'all',
                priority: 30,
              },
              // Form and validation libraries
              forms: {
                name: 'forms',
                test: /[\\/]node_modules[\\/](react-hook-form|zod|@hookform)[\\/]/,
                chunks: 'all',
                priority: 25,
              },
              // Vendor chunk for other node_modules
              vendor: {
                name: 'vendor',
                test: /[\\/]node_modules[\\/]/,
                chunks: 'all',
                priority: 20,
              },
              // Common components chunk
              common: {
                name: 'common',
                minChunks: 2,
                chunks: 'all',
                priority: 10,
                reuseExistingChunk: true,
                enforce: true,
              },
            },
          },
        };
      }
    }
    
    // Bundle analyzer for optimization insights
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: true,
        })
      );
    }
    
    return config
  },
  
  // Image optimization configuration with CDN support
  images: {
    // Define domains for optimized images
    domains: [
      'images.unsplash.com',
      'via.placeholder.com',
      'localhost',
      'res.cloudinary.com', // Cloudinary CDN
      'cdn.jsdelivr.net', // jsDelivr CDN
      'imagecdn.jobai.com', // Custom CDN domain
      'avatars.githubusercontent.com',
      'lh3.googleusercontent.com',
    ],
    // Image formats to support (AVIF first for better compression)
    formats: ['image/avif', 'image/webp'],
    // Cache TTL for optimized images (1 year)
    minimumCacheTTL: 31536000,
    // Enable image optimization
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Image sizes for different layouts
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Compression configuration
  compress: true,
  
  // Generate standalone output for better PWA performance
  output: 'standalone',
  
  // PoweredByHeader removal for security
  poweredByHeader: false
};

module.exports = nextConfig;