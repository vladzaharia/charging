/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Image optimization configuration
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },

  // Security headers configuration
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          // Enable XSS protection (legacy browsers)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // DNS prefetch control
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // NextJS requires unsafe-inline and unsafe-eval
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com", // Allow Google Fonts and inline styles
              "font-src 'self' fonts.gstatic.com data:", // Allow Google Fonts and data URIs
              "img-src 'self' data: blob: https:", // Allow images from various sources
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cloud.volttime.com https://accounts.google.com https://appleid.apple.com", // Allow API connections
              "frame-src 'self' https://accounts.google.com https://appleid.apple.com", // Allow OAuth frames
              "frame-ancestors 'none'", // Equivalent to X-Frame-Options: DENY
              "base-uri 'self'",
              "form-action 'self' https://accounts.google.com https://appleid.apple.com", // Allow OAuth form submissions
              "object-src 'none'",
              "media-src 'self'",
              "worker-src 'self' blob:",
            ].join('; '),
          },
          // HTTP Strict Transport Security (HSTS) - only in production
          ...(process.env.NODE_ENV === 'production'
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains; preload',
                },
              ]
            : []),
          // Permissions Policy (Feature Policy replacement)
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',
              'microphone=()',
              'geolocation=(self)',
              'interest-cohort=()',
            ].join(', '),
          },
        ],
      },
      // API routes specific headers
      {
        source: '/api/(.*)',
        headers: [
          // CORS headers for API routes
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production'
              ? 'https://charge.polaris.rest'
              : '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400', // 24 hours
          },
          // API-specific security headers
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ];
  },
}

export default nextConfig
