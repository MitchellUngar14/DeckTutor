import { NextResponse } from 'next/server';
import { checkCombos, ComboServiceError } from '@/lib/clients/combo-service';
import type { ComboCheckRequest } from '@/types';

export async function POST(request: Request) {
  try {
    const body: ComboCheckRequest = await request.json();

    if (!body.cards || body.cards.length === 0) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'cards array is required' },
        { status: 400 }
      );
    }

    const result = await checkCombos(body);

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'private, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Combo check error:', error);

    if (error instanceof ComboServiceError) {
      return NextResponse.json(
        {
          error: 'COMBO_SERVICE_ERROR',
          message: 'Combo detection service is currently unavailable',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to check combos' },
      { status: 500 }
    );
  }
}
