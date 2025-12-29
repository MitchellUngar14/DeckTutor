import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { extractDeckId, getDeck, MoxfieldError } from '@/lib/clients/moxfield';
import { getCardsInBulk } from '@/lib/clients/scryfall';
import { calculateDeckStats, type Deck, type DeckCard } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { moxfieldUrl } = body;

    if (!moxfieldUrl) {
      return NextResponse.json(
        { error: 'MISSING_URL', message: 'Moxfield URL is required' },
        { status: 400 }
      );
    }

    const deckId = extractDeckId(moxfieldUrl);
    if (!deckId) {
      return NextResponse.json(
        { error: 'INVALID_URL', message: 'Could not parse Moxfield URL' },
        { status: 400 }
      );
    }

    // Fetch deck from Moxfield
    const moxfieldDeck = await getDeck(deckId);

    // Collect all card names
    const cardNames: string[] = [];
    const cardQuantities: Record<string, { quantity: number; board: DeckCard['board'] }[]> = {};

    const processCards = (
      cards: Record<string, { quantity: number; card: { name: string; scryfall_id: string } }>,
      board: DeckCard['board']
    ) => {
      for (const [, entry] of Object.entries(cards)) {
        const name = entry.card.name;
        if (!cardQuantities[name]) {
          cardQuantities[name] = [];
          cardNames.push(name);
        }
        cardQuantities[name].push({ quantity: entry.quantity, board });
      }
    };

    processCards(moxfieldDeck.commanders, 'commanders');
    processCards(moxfieldDeck.mainboard, 'mainboard');
    processCards(moxfieldDeck.sideboard, 'sideboard');
    processCards(moxfieldDeck.maybeboard, 'maybeboard');

    // Fetch card data from Scryfall
    const { cards, notFound } = await getCardsInBulk(
      cardNames.map((name) => ({ name }))
    );

    if (notFound.length > 0) {
      console.warn('Cards not found:', notFound);
    }

    // Build deck structure
    const cardMap = new Map(cards.map((c) => [c.name, c]));

    const commanders = Object.values(moxfieldDeck.commanders)
      .map((entry) => cardMap.get(entry.card.name))
      .filter((c): c is NonNullable<typeof c> => c !== undefined);

    const buildDeckCards = (
      moxfieldCards: Record<string, { quantity: number; card: { name: string } }>,
      board: DeckCard['board']
    ): DeckCard[] => {
      return Object.values(moxfieldCards)
        .map((entry) => {
          const card = cardMap.get(entry.card.name);
          if (!card) return null;
          return {
            card,
            quantity: entry.quantity,
            board,
          };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);
    };

    const deck: Deck = {
      id: nanoid(),
      name: moxfieldDeck.name,
      description: moxfieldDeck.description,
      format: (moxfieldDeck.format as Deck['format']) || 'commander',
      commanders,
      mainboard: buildDeckCards(moxfieldDeck.mainboard, 'mainboard'),
      sideboard: buildDeckCards(moxfieldDeck.sideboard, 'sideboard'),
      maybeboard: buildDeckCards(moxfieldDeck.maybeboard, 'maybeboard'),
      moxfieldId: moxfieldDeck.id,
      moxfieldUrl: `https://www.moxfield.com/decks/${moxfieldDeck.publicId}`,
      importedAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
    };

    const stats = calculateDeckStats(deck);

    return NextResponse.json({ deck, stats });
  } catch (error) {
    console.error('Import error:', error);

    if (error instanceof MoxfieldError) {
      return NextResponse.json(
        { error: 'MOXFIELD_ERROR', message: error.message },
        { status: error.status === 404 ? 404 : 502 }
      );
    }

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to import deck' },
      { status: 500 }
    );
  }
}
