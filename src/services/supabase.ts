import { createClient } from '@supabase/supabase-js';
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
  private readonly client;

  constructor() {
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required Supabase configuration');
    }

    this.client = createClient<Database>(supabaseUrl, supabaseKey);
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
}
