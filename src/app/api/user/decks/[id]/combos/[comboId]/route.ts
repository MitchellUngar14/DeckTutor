import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, customCombos, userDecks } from '@/lib/db';
import { verifyToken, extractBearerToken } from '@/lib/auth';

// GET /api/user/decks/[id]/combos/[comboId] - Get a single custom combo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; comboId: string }> }
) {
  try {
    const { id: deckId, comboId } = await params;
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
      .where(and(eq(userDecks.id, deckId), eq(userDecks.userId, payload.userId)))
      .limit(1);

    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    const [combo] = await db
      .select()
      .from(customCombos)
      .where(
        and(
          eq(customCombos.id, comboId),
          eq(customCombos.deckId, deckId),
          eq(customCombos.userId, payload.userId)
        )
      )
      .limit(1);

    if (!combo) {
      return NextResponse.json({ error: 'Combo not found' }, { status: 404 });
    }

    return NextResponse.json({ combo });
  } catch (error) {
    console.error('Error fetching custom combo:', error);
    return NextResponse.json({ error: 'Failed to fetch combo' }, { status: 500 });
  }
}

// PUT /api/user/decks/[id]/combos/[comboId] - Update a custom combo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; comboId: string }> }
) {
  try {
    const { id: deckId, comboId } = await params;
    const authHeader = request.headers.get('authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify the combo exists and belongs to the user's deck
    const [existingCombo] = await db
      .select({ id: customCombos.id })
      .from(customCombos)
      .where(
        and(
          eq(customCombos.id, comboId),
          eq(customCombos.deckId, deckId),
          eq(customCombos.userId, payload.userId)
        )
      )
      .limit(1);

    if (!existingCombo) {
      return NextResponse.json({ error: 'Combo not found' }, { status: 404 });
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

    const [updatedCombo] = await db
      .update(customCombos)
      .set({
        name: name.trim(),
        description: description.trim(),
        cardNames,
        cardIds: cardIds || null,
        colorIdentity: colorIdentity || null,
        updatedAt: new Date(),
      })
      .where(eq(customCombos.id, comboId))
      .returning();

    return NextResponse.json({ combo: updatedCombo });
  } catch (error) {
    console.error('Error updating custom combo:', error);
    return NextResponse.json({ error: 'Failed to update combo' }, { status: 500 });
  }
}

// DELETE /api/user/decks/[id]/combos/[comboId] - Delete a custom combo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; comboId: string }> }
) {
  try {
    const { id: deckId, comboId } = await params;
    const authHeader = request.headers.get('authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify the combo exists and belongs to the user's deck
    const [existingCombo] = await db
      .select({ id: customCombos.id })
      .from(customCombos)
      .where(
        and(
          eq(customCombos.id, comboId),
          eq(customCombos.deckId, deckId),
          eq(customCombos.userId, payload.userId)
        )
      )
      .limit(1);

    if (!existingCombo) {
      return NextResponse.json({ error: 'Combo not found' }, { status: 404 });
    }

    await db.delete(customCombos).where(eq(customCombos.id, comboId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom combo:', error);
    return NextResponse.json({ error: 'Failed to delete combo' }, { status: 500 });
  }
}
