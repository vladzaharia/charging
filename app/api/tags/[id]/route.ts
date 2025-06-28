import { SteVeService } from '@/services/steve';
import { supabase } from '@/services/supabase';
import { NextResponse } from 'next/server';
import { ValidationError, createValidationErrorResponse } from '@/middleware/validation/middleware';

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

    // Enhance tag with database data
    const enhancedTag = {
      ...tag,
      database_transaction_count: transactionCount || 0,
      database_active_transaction_count: activeTransactionCount || 0,
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
