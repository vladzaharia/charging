/**
 * Rate limiting utilities for API routes
 * Implements in-memory rate limiting with LRU cache for memory efficiency
 * Following existing error patterns and integrating with middleware
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Rate limit error class following existing error patterns
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public status: number = 429,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Rate limit configuration for different endpoint types
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
}

/**
 * Rate limit configurations for different endpoint types
 */
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // Public charger endpoints - more generous limits for guest access
  'charger-public': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute (1 per second)
    message: 'Too many requests to charger endpoints. Please try again later.',
  },

  // General API endpoints - standard limits
  'api-general': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
    message: 'Too many API requests. Please try again later.',
  },

  // Future authenticated endpoints - higher limits for authenticated users
  'api-authenticated': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 120, // 120 requests per minute
    message: 'Too many requests. Please try again later.',
  },

  // Future admin endpoints - very restrictive
  'api-admin': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
    message: 'Too many admin requests. Please try again later.',
  },
};

/**
 * Simple LRU cache implementation for rate limiting
 * Keeps memory usage bounded while providing efficient lookups
 */
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  /**
   * Get all entries for cleanup purposes
   */
  entries(): IterableIterator<[K, V]> {
    return this.cache.entries();
  }
}

/**
 * Rate limit entry tracking requests for an IP
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

/**
 * Rate limiter class using in-memory storage with LRU cache
 */
class RateLimiter {
  private cache: LRUCache<string, RateLimitEntry>;
  private cleanupInterval: NodeJS.Timeout;

  constructor(maxEntries: number = 1000) {
    this.cache = new LRUCache<string, RateLimitEntry>(maxEntries);

    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000
    );
  }

  /**
   * Check if request should be rate limited
   */
  checkLimit(
    key: string,
    config: RateLimitConfig
  ): {
    allowed: boolean;
    count: number;
    resetTime: number;
    retryAfter?: number;
  } {
    const now = Date.now();
    const entry = this.cache.get(key);

    if (!entry || now >= entry.resetTime) {
      // First request or window expired, create new entry
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + config.windowMs,
        firstRequest: now,
      };
      this.cache.set(key, newEntry);

      return {
        allowed: true,
        count: 1,
        resetTime: newEntry.resetTime,
      };
    }

    // Increment count for existing entry
    entry.count++;
    this.cache.set(key, entry);

    if (entry.count > config.maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return {
        allowed: false,
        count: entry.count,
        resetTime: entry.resetTime,
        retryAfter,
      };
    }

    return {
      allowed: true,
      count: entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Clean up expired entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    // Iterate over cache entries to find expired ones
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.resetTime) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Global rate limiter instance
let rateLimiter: RateLimiter | null = null;

/**
 * Get or create the global rate limiter instance
 */
function getRateLimiter(): RateLimiter {
  if (!rateLimiter) {
    rateLimiter = new RateLimiter();
  }
  return rateLimiter;
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Fallback when no IP headers are available
  return 'unknown';
}

/**
 * Determine rate limit type based on request path and authentication
 */
export function getRateLimitType(pathname: string, isAuthenticated: boolean): string {
  // Charger endpoints (public access needed for guests)
  if (pathname.startsWith('/api/charger')) {
    return 'charger-public';
  }

  // Future admin endpoints
  if (pathname.startsWith('/api/admin')) {
    return 'api-admin';
  }

  // Authenticated vs general API endpoints
  if (isAuthenticated) {
    return 'api-authenticated';
  }

  return 'api-general';
}

/**
 * Apply rate limiting to a request
 */
export function applyRateLimit(
  request: NextRequest,
  isAuthenticated: boolean = false
): {
  allowed: boolean;
  response?: NextResponse;
  headers: Record<string, string>;
} {
  const limiter = getRateLimiter();
  const clientIP = getClientIP(request);
  const rateLimitType = getRateLimitType(request.nextUrl.pathname, isAuthenticated);
  const config = RATE_LIMIT_CONFIGS[rateLimitType];

  if (!config) {
    // No rate limiting configured for this endpoint type
    return { allowed: true, headers: {} };
  }

  const key = `${rateLimitType}:${clientIP}`;
  const result = limiter.checkLimit(key, config);

  // Prepare rate limit headers
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': Math.max(0, config.maxRequests - result.count).toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
    'X-RateLimit-Window': Math.ceil(config.windowMs / 1000).toString(),
  };

  if (!result.allowed) {
    // Rate limit exceeded
    if (result.retryAfter) {
      headers['Retry-After'] = result.retryAfter.toString();
    }

    const response = NextResponse.json(
      {
        error: config.message || 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: result.retryAfter,
      },
      { status: 429 }
    );

    // Add rate limit headers to response
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return {
      allowed: false,
      response,
      headers,
    };
  }

  return {
    allowed: true,
    headers,
  };
}

/**
 * Add rate limit headers to an existing response
 */
export function addRateLimitHeaders(response: NextResponse, headers: Record<string, string>): void {
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
}
