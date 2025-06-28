import { SteVeService } from '@/services/steve';
import { supabase } from '@/services/supabase';
import { NextResponse } from 'next/server';
import { ValidationError, createValidationErrorResponse } from '@/middleware/validation/middleware';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Parse query parameters manually to avoid type issues
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const q = searchParams.get('q');
    const flat = searchParams.get('flat') === 'true';
    const parent_only = searchParams.get('parent_only') === 'true';
    const in_transaction =
      searchParams.get('in_transaction') === 'true'
        ? true
        : searchParams.get('in_transaction') === 'false'
          ? false
          : undefined;

    const query = { page, limit, q, flat, parent_only, in_transaction };

    // Initialize SteVe service
    const steveService = new SteVeService({
      serverUrl: process.env.STEVE_SERVER_URL!,
      username: process.env.STEVE_USERNAME!,
      password: process.env.STEVE_PASSWORD!,
      authKey: process.env.STEVE_AUTH_KEY!,
    });

    await steveService.authenticate();

    // Get all OCPP tags with hierarchical structure from SteVe
    const allTags = await steveService.getOcppTags();

    // Enhance tags with database transaction counts (including children)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enhanceTag = async (tag: any): Promise<any> => {
      // Get transaction count from database for this tag
      const { count: transactionCount } = await supabase.client
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('ocpp_tag_id', tag.idTag);

      // Get active transaction count
      const { count: activeTransactionCount } = await supabase.client
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('ocpp_tag_id', tag.idTag)
        .eq('is_active', true);

      // Enhance children recursively
      const enhancedChildren = tag.children
        ? await Promise.all(tag.children.map(enhanceTag))
        : tag.children;

      return {
        ...tag,
        children: enhancedChildren,
        database_transaction_count: transactionCount || 0,
        database_active_transaction_count: activeTransactionCount || 0,
      };
    };

    const enhancedTags = await Promise.all(allTags.map(enhanceTag));

    try {
      // Determine if we should return flat or hierarchical structure
      let tagsToFilter = enhancedTags;

      if (query.flat) {
        // Flatten the hierarchical structure to include all tags at top level
        const flatTags: typeof enhancedTags = [];

        const addTagsRecursively = (tags: typeof enhancedTags) => {
          for (const tag of tags) {
            // Add the tag itself (without children property for flat structure)
            const { children, ...tagWithoutChildren } = tag;
            flatTags.push(tagWithoutChildren as typeof tag);

            // Add children recursively
            if (children && children.length > 0) {
              addTagsRecursively(children);
            }
          }
        };

        addTagsRecursively(enhancedTags);
        tagsToFilter = flatTags;
      }

      // Apply filtering
      let filteredTags = tagsToFilter;

      // Filter by parent_only
      if (query.parent_only) {
        filteredTags = filteredTags.filter((tag) => !tag.parentOcppTagPk);
      }

      // Filter by in_transaction
      if (query.in_transaction !== undefined) {
        filteredTags = filteredTags.filter((tag) => tag.inTransaction === query.in_transaction);
      }

      // Apply search filtering if query provided
      if (query.q) {
        const searchQuery = query.q.toLowerCase();
        filteredTags = filteredTags.filter(
          (tag) =>
            tag.idTag.toLowerCase().includes(searchQuery) ||
            (tag.note && tag.note.toLowerCase().includes(searchQuery))
        );
      }

      // Apply pagination
      const totalCount = filteredTags.length;
      const page = query.page || 1;
      const limit = query.limit || 10;
      const offset = (page - 1) * limit;
      const paginatedTags = filteredTags.slice(offset, offset + limit);

      // Restructure tags for better organization
      const structuredTags = paginatedTags.map((tag) => ({
        // Core tag information
        tag: {
          id: tag.idTag,
          steve_pk: tag.ocppTagPk,
          parent_id: tag.parentIdTag || null,
          parent_pk: tag.parentOcppTagPk || null,
          status: tag.blocked ? 'blocked' : 'active',
          in_transaction: tag.inTransaction,
        },
        // Tag configuration
        config: {
          expiry_date: tag.expiryDate || null,
          max_active_transactions: tag.maxActiveTransactionCount || 1,
          note: tag.note || null,
        },
        // Usage statistics from database
        usage: {
          total_transactions: tag.database_transaction_count,
          active_transactions: tag.database_active_transaction_count,
          steve_active_count: tag.activeTransactionCount,
        },
        // Hierarchy information
        hierarchy: {
          has_children: (tag.children || []).length > 0,
          children_count: (tag.children || []).length,
          children: tag.children || [],
        },
        // Legacy fields for backward compatibility
        ...tag,
      }));

      return NextResponse.json({
        // Main data
        data: structuredTags,
        // Metadata
        meta: {
          count: paginatedTags.length,
          total: totalCount,
          structure: query.flat ? 'flat' : 'hierarchical',
          filters_applied: {
            search: query.q || null,
            parent_only: query.parent_only || false,
            in_transaction: query.in_transaction || null,
          },
        },
        // Pagination
        pagination: {
          current_page: page,
          per_page: limit,
          total_pages: Math.ceil(totalCount / limit),
          has_next: page < Math.ceil(totalCount / limit),
          has_prev: page > 1,
        },
        // Legacy format for backward compatibility
        tags: paginatedTags,
        count: paginatedTags.length,
        total: totalCount,
      });
    } finally {
      await steveService.logout();
    }
  } catch (error) {
    console.error('Error fetching OCPP tags:', error);

    // Handle validation errors
    if (error instanceof ValidationError) {
      return createValidationErrorResponse(error);
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
