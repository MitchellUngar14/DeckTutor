import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, userDecks } from '@/lib/db';

// GET /api/decks/[id] - Get a deck by ID (public, read-only, no auth required)
// This allows anyone with the link to view the deck
// Note: Modifications still require auth via /api/user/decks/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [deck] = await db
      .select()
      .from(userDecks)
      .where(eq(userDecks.id, id))
      .limit(1);

    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    // Return deck data without exposing userId
    return NextResponse.json({
      deck: {
        id: deck.id,
        name: deck.name,
        description: deck.description,
        format: deck.format,
        moxfieldId: deck.moxfieldId,
        createdAt: deck.createdAt,
        lastModifiedAt: deck.lastModifiedAt,
        deckData: deck.moxfieldData,
      },
    });
  } catch (error) {
    console.error('Error fetching deck:', error);
    return NextResponse.json({ error: 'Failed to fetch deck' }, { status: 500 });
  }
}
