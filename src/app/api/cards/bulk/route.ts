import { NextResponse } from 'next/server';
import { getCardsInBulk, ScryfallError } from '@/lib/clients/scryfall';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cards: cardNames } = body;

    if (!Array.isArray(cardNames) || cardNames.length === 0) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'cards array is required' },
        { status: 400 }
      );
    }

    if (cardNames.length > 300) {
      return NextResponse.json(
        { error: 'TOO_MANY_CARDS', message: 'Maximum 300 cards per request' },
        { status: 400 }
      );
    }

    const identifiers = cardNames.map((name: string) => ({ name }));
    const { cards, notFound } = await getCardsInBulk(identifiers);

    return NextResponse.json({
      cards,
      notFound,
      fetched: cards.length,
    });
  } catch (error) {
    if (error instanceof ScryfallError) {
      return NextResponse.json(
        { error: 'SCRYFALL_ERROR', message: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch cards' },
      { status: 500 }
    );
  }
}
