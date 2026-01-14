import { NextRequest, NextResponse } from 'next/server';
import { eq, inArray } from 'drizzle-orm';
import { db, userDecks, userDeckCards, cards } from '@/lib/db';
import { verifyToken, extractBearerToken } from '@/lib/auth';

// GET /api/user/decks - List user's saved decks
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const decks = await db
      .select({
        id: userDecks.id,
        name: userDecks.name,
        description: userDecks.description,
        format: userDecks.format,
        moxfieldId: userDecks.moxfieldId,
        commanderIds: userDecks.commanderIds,
        createdAt: userDecks.createdAt,
        lastModifiedAt: userDecks.lastModifiedAt,
      })
      .from(userDecks)
      .where(eq(userDecks.userId, payload.userId))
      .orderBy(userDecks.lastModifiedAt);

    // Fetch commander card data for all decks
    const allCommanderIds = decks
      .flatMap(d => d.commanderIds || [])
      .filter((id): id is string => id !== null);

    let commanderCards: { id: string; name: string; imageUris: unknown }[] = [];
    if (allCommanderIds.length > 0) {
      commanderCards = await db
        .select({
          id: cards.id,
          name: cards.name,
          imageUris: cards.imageUris,
        })
        .from(cards)
        .where(inArray(cards.id, allCommanderIds));
    }

    // Create a map of commander data
    const commanderMap = new Map(commanderCards.map(c => [c.id, c]));

    // Add commander data to each deck
    const decksWithCommanders = decks.map(deck => ({
      ...deck,
      commanders: (deck.commanderIds || [])
        .map(id => id ? commanderMap.get(id) : null)
        .filter(Boolean),
    }));

    return NextResponse.json({ decks: decksWithCommanders });
  } catch (error) {
    console.error('Error fetching user decks:', error);
    return NextResponse.json({ error: 'Failed to fetch decks' }, { status: 500 });
  }
}

// POST /api/user/decks - Save a deck
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, format, moxfieldId, commanderIds, deckData } = body;

    if (!name) {
      return NextResponse.json({ error: 'Deck name is required' }, { status: 400 });
    }

    // Create the deck - store full deck data in moxfieldData for reliable retrieval
    const [newDeck] = await db
      .insert(userDecks)
      .values({
        userId: payload.userId,
        name,
        description,
        format: format || 'commander',
        moxfieldId,
        commanderIds,
        moxfieldData: deckData, // Store full deck with cards as JSON
      })
      .returning();

    return NextResponse.json({
      deck: {
        id: newDeck.id,
        name: newDeck.name,
        description: newDeck.description,
        format: newDeck.format,
        createdAt: newDeck.createdAt,
      },
    });
  } catch (error) {
    console.error('Error saving deck:', error);
    return NextResponse.json({ error: 'Failed to save deck' }, { status: 500 });
  }
}
