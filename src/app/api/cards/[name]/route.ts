import { NextResponse } from 'next/server';
import { getCardByName, ScryfallError } from '@/lib/clients/scryfall';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const decodedName = decodeURIComponent(name);

    const card = await getCardByName(decodedName);

    return NextResponse.json(card, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    if (error instanceof ScryfallError) {
      return NextResponse.json(
        { error: 'CARD_NOT_FOUND', message: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch card' },
      { status: 500 }
    );
  }
}
