import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

export class SupabaseError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'SupabaseError';
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
