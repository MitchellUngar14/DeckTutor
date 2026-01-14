import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, customCombos, userDecks } from '@/lib/db';
import { verifyToken, extractBearerToken } from '@/lib/auth';

// GET /api/user/decks/[id]/combos - List custom combos for a deck
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

    // Verify the deck belongs to the user
    const [deck] = await db
      .select({ id: userDecks.id })
      .from(userDecks)
      .where(and(eq(userDecks.id, id), eq(userDecks.userId, payload.userId)))
      .limit(1);

    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    const combos = await db
      .select()
      .from(customCombos)
      .where(and(eq(customCombos.deckId, id), eq(customCombos.userId, payload.userId)))
      .orderBy(customCombos.createdAt);

    return NextResponse.json({ combos });
  } catch (error) {
    console.error('Error fetching custom combos:', error);
    return NextResponse.json({ error: 'Failed to fetch combos' }, { status: 500 });
  }
}

// POST /api/user/decks/[id]/combos - Create a new custom combo for a deck
export async function POST(
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

    const body = await request.json();
    const { name, description, cardNames, cardIds, colorIdentity } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Combo name is required' }, { status: 400 });
    }

    if (!description || !description.trim()) {
      return NextResponse.json({ error: 'Combo description is required' }, { status: 400 });
    }

    if (!cardNames || !Array.isArray(cardNames) || cardNames.length < 2) {
      return NextResponse.json({ error: 'At least 2 cards are required for a combo' }, { status: 400 });
    }

    const [newCombo] = await db
      .insert(customCombos)
      .values({
        userId: payload.userId,
        deckId: id,
        name: name.trim(),
        description: description.trim(),
        cardNames,
        cardIds: cardIds || null,
        colorIdentity: colorIdentity || null,
      })
      .returning();

    return NextResponse.json({ combo: newCombo });
  } catch (error) {
    console.error('Error creating custom combo:', error);
    return NextResponse.json({ error: 'Failed to create combo' }, { status: 500 });
  }
}
