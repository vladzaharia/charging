import { SteVeService } from '@/services/steve';
import { supabase } from '@/services/supabase';
import { NextResponse } from 'next/server';
import { ValidationError, createValidationErrorResponse } from '@/middleware/validation/middleware';

/**
 * Helper function to get human-readable tag classification
 */
function getTagClassification(tagType: string, tagId: string): string {
  switch (tagType) {
    case 'admin':
      return 'Administrative Tag';
    case 'physical':
      if (tagId.startsWith('OCPP-')) {
        return 'Physical User Tag';
      }
      return 'Physical RFID Card';
    case 'user':
      return 'Remote Access Tag';
    case 'meta':
      if (tagId === 'POLARIS-EXPRESS') {
        return 'Polaris Express Meta-Tag';
      }
      return 'System Meta-Tag';
    default:
      return 'Unknown Tag Type';
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Get and validate tag ID parameter
    const { id: idString } = await params;
    const tagId = parseInt(idString, 10);

    if (isNaN(tagId) || tagId <= 0) {
      return NextResponse.json({ error: 'Invalid tag ID' }, { status: 400 });
    }

    // Initialize SteVe service
    const steveService = new SteVeService({
      serverUrl: process.env.STEVE_SERVER_URL!,
      username: process.env.STEVE_USERNAME!,
      password: process.env.STEVE_PASSWORD!,
      authKey: process.env.STEVE_AUTH_KEY!,
    });

    await steveService.authenticate();

    // Get the specific OCPP tag with enhanced data
    const tag = await steveService.getOcppTag(tagId);

    if (!tag) {
      await steveService.logout();
      return NextResponse.json({ error: 'OCPP tag not found' }, { status: 404 });
    }

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

    // Get tag classification from database
    const { data: dbTag } = await supabase.client
      .from('ocpp_tags')
      .select('tag_type')
      .eq('id_tag', tag.idTag)
      .single();

    // Get user links for this tag (if it's linkable)
    const { count: linkedUserCount } = await supabase.client
      .from('user_tag_links')
      .select('*', { count: 'exact', head: true })
      .eq('tag_id', tag.idTag)
      .eq('is_active', true);

    // Enhance tag with database data and classification
    const enhancedTag = {
      ...tag,
      database_transaction_count: transactionCount || 0,
      database_active_transaction_count: activeTransactionCount || 0,
      tag_type: dbTag?.tag_type || 'admin',
      linked_user_count: linkedUserCount || 0,
      is_linkable: ['physical', 'meta'].includes(dbTag?.tag_type || 'admin'),
      classification: getTagClassification(dbTag?.tag_type || 'admin', tag.idTag),
    };

    await steveService.logout();

    return NextResponse.json(enhancedTag);
  } catch (error) {
    console.error('Error fetching OCPP tag:', error);

    // Handle validation errors
    if (error instanceof ValidationError) {
      return createValidationErrorResponse(error);
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
