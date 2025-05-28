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
          charger.id.toLowerCase().includes(query) || charger.charger_id.toString().includes(query)
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

    return NextResponse.json({
      chargers: paginatedChargers,
      count: paginatedChargers.length,
      total: totalCount,
      ...(pagination && {
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          totalPages: Math.ceil(totalCount / pagination.limit),
        },
      }),
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
