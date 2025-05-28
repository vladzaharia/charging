import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

/**
 * Enhanced Supabase error class with metadata support
 */
export class SupabaseError extends Error {
  public readonly metadata: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    category:
      | 'authentication'
      | 'authorization'
      | 'validation'
      | 'network'
      | 'server'
      | 'client'
      | 'external';
    correlationId?: string;
    timestamp: Date;
    context?: Record<string, unknown>;
    retryable: boolean;
    userMessage: string;
  };

  constructor(
    message: string,
    public status: number = 500,
    public code?: string,
    metadata: Partial<typeof SupabaseError.prototype.metadata> = {}
  ) {
    super(message);
    this.name = 'SupabaseError';

    // Determine retryability and severity based on status code
    const isRetryable = status >= 500 || status === 429;
    const severity = status >= 500 ? 'high' : status === 404 ? 'low' : 'medium';

    this.metadata = {
      severity,
      category: 'external',
      timestamp: new Date(),
      retryable: isRetryable,
      userMessage: this.getDefaultUserMessage(status),
      context: { statusCode: status, code },
      ...metadata,
    };
  }

  private getDefaultUserMessage(status: number): string {
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Authentication required. Please sign in.';
      case 403:
        return 'Access denied. You do not have permission.';
      case 404:
        return 'The requested resource was not found.';
      case 429:
        return 'Too many requests. Please wait a moment.';
      case 500:
        return 'Database service temporarily unavailable.';
      default:
        return 'Database error occurred. Please try again.';
    }
  }
}

export class SupabaseService {
  private static instance: SupabaseService;
  public client: SupabaseClient<Database> = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  private constructor() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Missing required Supabase configuration');
    }
  }

  async getChargerById(id: string) {
    const { data, error } = await this.client
      .from('chargers')
      .select(
        `
        id,
        charger_id,
        connectors (
          connector_id,
          connector_idx,
          connector_type
        )
      `
      )
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new SupabaseError('Charger not found', 404, error.code);
      }
      throw new SupabaseError(error.message, 500, error.code);
    }

    if (!data) {
      throw new SupabaseError('Charger not found', 404);
    }

    return data;
  }

  async listChargers() {
    const { data, error } = await this.client
      .from('chargers')
      .select(
        `
        id,
        charger_id,
        charger_uuid,
        site_uuid,
        site_id,
        is_hidden,
        connectors (
          connector_id,
          connector_idx,
          connector_type
        )
      `
      )
      .eq('is_hidden', false) // Only return non-hidden chargers for list operations
      .order('id');

    if (error) {
      throw new SupabaseError(error.message, 500, error.code);
    }

    return data || [];
  }
}

// Export singleton instance
export const supabase = SupabaseService.getInstance();
