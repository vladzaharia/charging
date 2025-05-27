import { SupabaseService, SupabaseError } from '@/services/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabaseService = SupabaseService.getInstance();
    const chargers = await supabaseService.listChargers();

    return NextResponse.json({
      chargers,
      count: chargers.length,
    });
  } catch (error) {
    console.error('Error fetching chargers:', error);

    if (error instanceof SupabaseError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
