import { SupabaseService, SupabaseError } from '@/services/supabase';
import { NextResponse } from 'next/server';
import { ValidationError, createValidationErrorResponse } from '@/middleware/validation/middleware';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Parse and validate pagination parameters
    let pagination: { page: number; limit: number } | undefined;
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    if (pageParam || limitParam) {
      const page = pageParam ? parseInt(pageParam, 10) : 1;
      const limit = limitParam ? parseInt(limitParam, 10) : 10;

      if (isNaN(page) || page <= 0) {
        throw new ValidationError('Page must be a positive number', 400);
      }
      if (isNaN(limit) || limit <= 0 || limit > 100) {
        throw new ValidationError('Limit must be between 1 and 100', 400);
      }

      pagination = { page, limit };
    }

    // Parse and validate search parameters
    let search: { q: string } | undefined;
    const qParam = searchParams.get('q');

    if (qParam) {
      // Prevent XSS in search queries
      if (/<script|javascript:|data:|vbscript:|on\w+\s*=/i.test(qParam)) {
        throw new ValidationError('Search query contains invalid characters', 400);
      }
      search = { q: qParam };
    }

    const supabaseService = SupabaseService.getInstance();
    const chargers = await supabaseService.listChargers();

    // Apply search filtering if query provided
    let filteredChargers = chargers;
    if (search?.q) {
      const query = search.q.toLowerCase();
      filteredChargers = chargers.filter(
        (charger) =>
          charger.id.toLowerCase().includes(query) ||
          charger.charge_box_id?.toLowerCase().includes(query) ||
          charger.name?.toLowerCase().includes(query)
      );
    }

    // Apply pagination if provided
    let paginatedChargers = filteredChargers;
    const totalCount = filteredChargers.length;

    if (pagination) {
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;
      paginatedChargers = filteredChargers.slice(offset, offset + limit);
    }

    // Enhance chargers with active transaction counts
    const enhancedChargers = await Promise.all(
      paginatedChargers.map(async (charger) => {
        // Get active transaction count for this charger
        const { count: activeTransactionCount } = await supabaseService.client
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('charger_id', charger.id)
          .eq('is_active', true);

        // Get total transaction count
        const { count: totalTransactionCount } = await supabaseService.client
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('charger_id', charger.id);

        return {
          // Core charger data
          charger: {
            id: charger.id,
            name: charger.name,
            location: charger.location,
            charge_box_id: charger.charge_box_id,
            is_hidden: charger.is_hidden,
          },
          // Usage statistics
          usage: {
            active_sessions: activeTransactionCount || 0,
            total_transactions: totalTransactionCount || 0,
            is_in_use: (activeTransactionCount || 0) > 0,
          },
          // Legacy format for backward compatibility
          ...charger,
        };
      })
    );

    return NextResponse.json({
      // Main data
      data: enhancedChargers,
      // Metadata
      meta: {
        count: paginatedChargers.length,
        total: totalCount,
        filters_applied: {
          search: search?.q || null,
          hidden: false, // This endpoint doesn't filter by hidden status yet
        },
      },
      // Pagination (if requested)
      ...(pagination && {
        pagination: {
          current_page: pagination.page,
          per_page: pagination.limit,
          total_pages: Math.ceil(totalCount / pagination.limit),
          has_next: pagination.page < Math.ceil(totalCount / pagination.limit),
          has_prev: pagination.page > 1,
        },
      }),
      // Legacy format for backward compatibility
      chargers: paginatedChargers,
      count: paginatedChargers.length,
      total: totalCount,
    });
  } catch (error) {
    console.error('Error fetching chargers:', error);

    // Handle validation errors
    if (error instanceof ValidationError) {
      return createValidationErrorResponse(error);
    }

    if (error instanceof SupabaseError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
