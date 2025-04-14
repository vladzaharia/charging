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
  private static client: SupabaseClient<Database>;

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  public static getClient(): SupabaseClient<Database> {
    if (!SupabaseService.client) {
      SupabaseService.client = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );
    }
    return SupabaseService.client;
  }

  private constructor() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Missing required Supabase configuration');
    }
  }

  async getChargerById(id: string) {
    const { data, error } = await SupabaseService.getClient()
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
}

// Export singleton instance
export const supabase = SupabaseService.getClient();
