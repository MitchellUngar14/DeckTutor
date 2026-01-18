import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, userDecks, userDeckCards, cards } from '@/lib/db';
import { verifyToken, extractBearerToken } from '@/lib/auth';

// GET /api/user/decks/[id] - Get a single saved deck with cards
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get the deck with full deck data stored in moxfieldData
    const [deck] = await db
      .select()
      .from(userDecks)
      .where(and(eq(userDecks.id, id), eq(userDecks.userId, payload.userId)))
      .limit(1);

    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    // Return deck with deckData (stored in moxfieldData)
    return NextResponse.json({
      deck: {
        ...deck,
        deckData: deck.moxfieldData, // Full deck data with cards
      },
    });
  } catch (error) {
    console.error('Error fetching deck:', error);
    return NextResponse.json({ error: 'Failed to fetch deck' }, { status: 500 });
  }
}

// PUT /api/user/decks/[id] - Update a saved deck
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify the deck belongs to the user
    const [existingDeck] = await db
      .select({ id: userDecks.id })
      .from(userDecks)
      .where(and(eq(userDecks.id, id), eq(userDecks.userId, payload.userId)))
      .limit(1);

    if (!existingDeck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, format, commanderIds, deckData } = body;

    // Update the deck
    const [updatedDeck] = await db
      .update(userDecks)
      .set({
        name,
        description,
        format,
        commanderIds,
        moxfieldData: deckData,
        lastModifiedAt: new Date(),
      })
      .where(eq(userDecks.id, id))
      .returning();

    return NextResponse.json({
      deck: {
        id: updatedDeck.id,
        name: updatedDeck.name,
        description: updatedDeck.description,
        format: updatedDeck.format,
        lastModifiedAt: updatedDeck.lastModifiedAt,
      },
    });
  } catch (error) {
    console.error('Error updating deck:', error);
    return NextResponse.json({ error: 'Failed to update deck' }, { status: 500 });
  }
}

// DELETE /api/user/decks/[id] - Delete a saved deck
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify the deck belongs to the user
    const [deck] = await db
      .select({ id: userDecks.id })
      .from(userDecks)
      .where(and(eq(userDecks.id, id), eq(userDecks.userId, payload.userId)))
      .limit(1);

    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    // Delete the deck (cascades to cards)
    await db.delete(userDecks).where(eq(userDecks.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting deck:', error);
    return NextResponse.json({ error: 'Failed to delete deck' }, { status: 500 });
  }
}
