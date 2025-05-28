import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { applyRateLimit, addRateLimitHeaders } from '@/lib/rate-limit';

/**
 * Security middleware for NextJS application
 * Handles security headers, authentication checks, and CSRF protection
 */

// Define public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/auth/callback',
  '/api/chargers', // Public charger listing for guests
  '/api/charger/', // Individual charger access is also public for guests
];

// Define API routes that require authentication (none currently, but ready for future)
const PROTECTED_API_ROUTES: string[] = [
  // Future authenticated endpoints will go here
];

/**
 * Check if a route is public (doesn't require authentication)
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => {
    if (route === pathname) return true;
    // Handle dynamic routes
    if (route.endsWith('/') && pathname.startsWith(route)) return true;
    return false;
  });
}

/**
 * Check if an API route requires authentication
 */
function isProtectedApiRoute(pathname: string): boolean {
  return PROTECTED_API_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Check if request is a state-changing operation that needs CSRF protection
 */
function isStateChangingRequest(request: NextRequest): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
}

/**
 * Add middleware-specific headers to response
 * Note: Security headers are now handled by next.config.mjs
 */
function addMiddlewareHeaders(response: NextResponse): void {
  // Remove powered by header (already disabled in next.config.mjs)
  response.headers.delete('X-Powered-By');
}

/**
 * Validate user session using Supabase SSR
 */
async function validateSession(request: NextRequest) {
  try {
    const response = NextResponse.next();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error('Session validation error:', error);
      return null;
    }

    return session;
  } catch (error) {
    console.error('Session validation failed:', error);
    return null;
  }
}

/**
 * Create unauthorized response following existing error patterns
 */
function createUnauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Add middleware-specific headers to all responses
  addMiddlewareHeaders(response);

  // Apply rate limiting to API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Check if user is authenticated for rate limiting purposes
    let isAuthenticated = false;
    if (isProtectedApiRoute(request.nextUrl.pathname)) {
      const session = await validateSession(request);
      isAuthenticated = !!session;
    }

    // Apply rate limiting
    const rateLimitResult = applyRateLimit(request, isAuthenticated);

    if (!rateLimitResult.allowed) {
      // Rate limit exceeded, return the rate limit response
      return rateLimitResult.response!;
    }

    // Add rate limit headers to successful responses
    addRateLimitHeaders(response, rateLimitResult.headers);
  }

  // Skip auth checks for public routes
  if (isPublicRoute(request.nextUrl.pathname)) {
    return response;
  }

  // Check authentication for protected API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (isProtectedApiRoute(request.nextUrl.pathname)) {
      const session = await validateSession(request);

      if (!session) {
        return createUnauthorizedResponse();
      }
    }
  }

  // CSRF protection for state-changing requests
  if (isStateChangingRequest(request)) {
    // For now, we rely on SameSite cookies and CORS
    // Additional CSRF token validation can be added here if needed
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');

    // Verify origin matches host for state-changing requests
    if (origin && host && !origin.includes(host)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }
  }

  return response;
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
