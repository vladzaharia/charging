import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Session, User } from '@supabase/supabase-js';

/**
 * Authentication utilities for API routes
 * Following existing error patterns and Supabase integration
 */

/**
 * Authentication error class following existing error patterns
 */
export class AuthenticationError extends Error {
  constructor(
    message: string,
    public status: number = 401,
    public code?: string
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error class for permission-related errors
 */
export class AuthorizationError extends Error {
  constructor(
    message: string,
    public status: number = 403,
    public code?: string
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Create a Supabase server client for API routes
 * Uses the cookies from the request for session management
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Validate user session for API routes
 * @returns Session object if valid, throws AuthenticationError if not
 */
export async function validateSession(): Promise<Session> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error('Session validation error:', error);
      throw new AuthenticationError('Authentication failed', 401, error.code);
    }

    if (!session) {
      throw new AuthenticationError('Authentication required', 401);
    }

    return session;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }

    console.error('Session validation failed:', error);
    throw new AuthenticationError('Authentication failed', 401);
  }
}

/**
 * Get current user from session
 * @returns User object if authenticated, throws AuthenticationError if not
 */
export async function getCurrentUser(): Promise<User> {
  const session = await validateSession();
  return session.user;
}

/**
 * Validate user session and return both session and user
 * @returns Object containing session and user
 */
export async function validateSessionAndUser(): Promise<{
  session: Session;
  user: User;
}> {
  const session = await validateSession();
  return {
    session,
    user: session.user,
  };
}

/**
 * Check if user has specific permission level
 * This would integrate with the RLS policies and permission system
 * @param userId - User ID to check permissions for
 * @param requiredRole - Required permission level
 * @returns true if user has permission, false otherwise
 */
export async function checkUserPermission(
  userId: string,
  requiredRole: 'viewer' | 'editor' | 'manager'
): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();

    // Query the permissions table to check user's role
    const { data, error } = await supabase
      .from('permissions')
      .select('role')
      .eq('supabase_id', userId)
      .single();

    if (error || !data) {
      // If no specific permission found, check if user has a profile (basic access)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('status')
        .eq('supabase_id', userId)
        .single();

      if (profileError || !profile) {
        return false;
      }

      // Users with active profiles have viewer access by default
      return profile.status === 'active' && requiredRole === 'viewer';
    }

    // Check if user's role meets the required level
    const roleHierarchy = { viewer: 1, editor: 2, manager: 3 };
    const userLevel = roleHierarchy[data.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole];

    return userLevel >= requiredLevel;
  } catch (error) {
    console.error('Permission check failed:', error);
    return false;
  }
}

/**
 * Require specific permission level for API access
 * @param requiredRole - Required permission level
 * @throws AuthorizationError if user doesn't have permission
 */
export async function requirePermission(
  requiredRole: 'viewer' | 'editor' | 'manager'
): Promise<User> {
  const user = await getCurrentUser();

  const hasPermission = await checkUserPermission(user.id, requiredRole);

  if (!hasPermission) {
    throw new AuthorizationError(`Insufficient permissions. Required: ${requiredRole}`, 403);
  }

  return user;
}

/**
 * Optional authentication - returns user if authenticated, null if not
 * Useful for endpoints that work for both authenticated and anonymous users
 * @returns User object if authenticated, null if not
 */
export async function getOptionalUser(): Promise<User | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      return null;
    }

    return session.user;
  } catch (error) {
    console.error('Optional auth check failed:', error);
    return null;
  }
}

/**
 * Check if current user is the owner of a resource
 * @param resourceUserId - User ID associated with the resource
 * @returns true if current user owns the resource
 */
export async function isResourceOwner(resourceUserId: string): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    return user.id === resourceUserId;
  } catch {
    return false;
  }
}

/**
 * Require resource ownership or specific permission level
 * @param resourceUserId - User ID associated with the resource
 * @param fallbackRole - Fallback permission level if not owner
 * @throws AuthorizationError if user doesn't have access
 */
export async function requireOwnershipOrPermission(
  resourceUserId: string,
  fallbackRole: 'viewer' | 'editor' | 'manager'
): Promise<User> {
  const user = await getCurrentUser();

  // Check if user owns the resource
  if (user.id === resourceUserId) {
    return user;
  }

  // Check if user has the required permission level
  const hasPermission = await checkUserPermission(user.id, fallbackRole);

  if (!hasPermission) {
    throw new AuthorizationError(
      'Access denied. You must be the resource owner or have sufficient permissions.',
      403
    );
  }

  return user;
}

/**
 * Create standardized authentication error response
 * Following existing API error response patterns
 */
export function createAuthErrorResponse(error: AuthenticationError | AuthorizationError) {
  return {
    error: error.message,
    code: error.code,
  };
}
