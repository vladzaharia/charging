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
        charge_box_id,
        charge_box_pk,
        name,
        location,
        is_hidden,
        connectors (
          connector_idx,
          connector_type,
          max_amperage
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
        charge_box_id,
        charge_box_pk,
        name,
        location,
        is_hidden,
        connectors (
          connector_idx,
          connector_type,
          max_amperage
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

  async getOcppTags() {
    const { data, error } = await this.client.from('ocpp_tags').select('*').order('id_tag');

    if (error) {
      throw new SupabaseError(error.message, 500, error.code);
    }

    return data || [];
  }

  async getOcppTagByStevePk(stevePk: number) {
    const { data, error } = await this.client
      .from('ocpp_tags')
      .select('*')
      .eq('steve_tag_pk', stevePk)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new SupabaseError(error.message, 500, error.code);
    }

    return data;
  }

  async getTransactions() {
    const { data, error } = await this.client
      .from('transactions')
      .select(
        `
        *,
        chargers!inner(*),
        connectors!inner(*),
        ocpp_tags!inner(*)
      `
      )
      .order('start_timestamp', { ascending: false });

    if (error) {
      throw new SupabaseError(error.message, 500, error.code);
    }

    return data || [];
  }

  async getTransactionById(id: string) {
    const { data, error } = await this.client
      .from('transactions')
      .select(
        `
        *,
        chargers!inner(*),
        connectors!inner(*),
        ocpp_tags!inner(*)
      `
      )
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new SupabaseError(error.message, 500, error.code);
    }

    return data;
  }

  async getTransactionsByOcppTag(tagId: string) {
    const { data, error } = await this.client
      .from('transactions')
      .select(
        `
        *,
        chargers!inner(*),
        connectors!inner(*),
        ocpp_tags!inner(*)
      `
      )
      .eq('ocpp_tag_id', tagId)
      .order('start_timestamp', { ascending: false });

    if (error) {
      throw new SupabaseError(error.message, 500, error.code);
    }

    return data || [];
  }

  // User-Tag Relationship Methods
  async getUserTagLinks(userId: string) {
    const { data, error } = await this.client
      .from('user_tags_view')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      throw new SupabaseError(error.message, 500, error.code);
    }

    return data || [];
  }

  async getTagUsers(tagId: string) {
    const { data, error } = await this.client
      .from('tag_users_view')
      .select('*')
      .eq('id_tag', tagId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new SupabaseError(error.message, 500, error.code);
    }

    return data;
  }

  async linkUserToTag(userId: string, tagId: string, linkedBy: string, reason?: string) {
    const { data, error } = await this.client
      .from('user_tag_links')
      .insert({
        user_id: userId,
        tag_id: tagId,
        linked_by: linkedBy,
        link_reason: reason,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw new SupabaseError(error.message, 500, error.code);
    }

    return data;
  }

  async unlinkUserFromTag(userId: string, tagId: string) {
    const { data, error } = await this.client
      .from('user_tag_links')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('tag_id', tagId)
      .select()
      .single();

    if (error) {
      throw new SupabaseError(error.message, 500, error.code);
    }

    return data;
  }

  async getOcppTagsByType(tagType: 'admin' | 'physical' | 'user' | 'meta') {
    const { data, error } = await this.client
      .from('ocpp_tags')
      .select('*')
      .eq('tag_type', tagType)
      .order('id_tag');

    if (error) {
      throw new SupabaseError(error.message, 500, error.code);
    }

    return data || [];
  }

  async getUserByNanoidTag(nanoidTag: string) {
    const { data, error } = await this.client
      .from('user_tag_links')
      .select(
        `
        user_id,
        profiles!inner(*)
      `
      )
      .eq('tag_id', nanoidTag)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new SupabaseError(error.message, 500, error.code);
    }

    return data;
  }

  /**
   * Translate nanoid charger ID to SteVe charge_box_id
   */
  async getChargeBoxIdFromNanoid(nanoidId: string): Promise<string> {
    const { data, error } = await this.client
      .from('chargers')
      .select('charge_box_id')
      .eq('id', nanoidId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new SupabaseError(`Charger with ID ${nanoidId} not found`, 404, error.code);
      }
      throw new SupabaseError(error.message, 500, error.code);
    }

    if (!data?.charge_box_id) {
      throw new SupabaseError(`Charger ${nanoidId} has no charge_box_id`, 500);
    }

    return data.charge_box_id;
  }

  /**
   * Translate SteVe charge_box_id to nanoid charger ID
   */
  async getNanoidFromChargeBoxId(chargeBoxId: string): Promise<string> {
    const { data, error } = await this.client
      .from('chargers')
      .select('id')
      .eq('charge_box_id', chargeBoxId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new SupabaseError(
          `Charger with charge_box_id ${chargeBoxId} not found`,
          404,
          error.code
        );
      }
      throw new SupabaseError(error.message, 500, error.code);
    }

    if (!data?.id) {
      throw new SupabaseError(`Charger with charge_box_id ${chargeBoxId} has no nanoid`, 500);
    }

    return data.id;
  }

  /**
   * Get charger by charge_box_id (for reverse lookups)
   */
  async getChargerByChargeBoxId(chargeBoxId: string) {
    const { data, error } = await this.client
      .from('chargers')
      .select(
        `
        id,
        charge_box_id,
        charge_box_pk,
        name,
        location,
        connectors (
          connector_idx,
          connector_type,
          max_amperage
        )
      `
      )
      .eq('charge_box_id', chargeBoxId)
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
export const supabase = SupabaseService.getInstance();
