import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { extractDeckId, getDeck, MoxfieldError } from '@/lib/clients/moxfield';
import { getCardsInBulk, getCardByFuzzyName, getCheapestPrice } from '@/lib/clients/scryfall';
import { calculateDeckStats, type Deck, type DeckCard, type Card } from '@/types';

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

    // Collect all Scryfall IDs from Moxfield data
    const scryfallIds: string[] = [];
    const cardEntries: Array<{
      scryfallId: string;
      name: string;
      quantity: number;
      board: DeckCard['board'];
    }> = [];

    const processCards = (
      cards: Record<string, { quantity: number; card: { name: string; scryfall_id: string } }>,
      board: DeckCard['board']
    ) => {
      for (const [, entry] of Object.entries(cards)) {
        const scryfallId = entry.card.scryfall_id;
        if (scryfallId && !scryfallIds.includes(scryfallId)) {
          scryfallIds.push(scryfallId);
        }
        cardEntries.push({
          scryfallId,
          name: entry.card.name,
          quantity: entry.quantity,
          board,
        });
      }
    };

    processCards(moxfieldDeck.commanders, 'commanders');
    processCards(moxfieldDeck.mainboard, 'mainboard');
    processCards(moxfieldDeck.sideboard, 'sideboard');
    processCards(moxfieldDeck.maybeboard, 'maybeboard');

    console.log('=== DEBUG: Import Summary ===');
    console.log('Total card entries:', cardEntries.length);
    console.log('Unique Scryfall IDs:', scryfallIds.length);
    console.log('Commanders:', cardEntries.filter(e => e.board === 'commanders').map(e => ({ name: e.name, id: e.scryfallId })));
    console.log('Sample mainboard entries:', cardEntries.filter(e => e.board === 'mainboard').slice(0, 5).map(e => ({ name: e.name, id: e.scryfallId })));

    // Fetch card data from Scryfall using IDs (more reliable than names)
    const { cards, notFound } = await getCardsInBulk(
      scryfallIds.map((id) => ({ id }))
    );

    console.log('Cards fetched from Scryfall:', cards.length);
    if (notFound.length > 0) {
      console.warn('Cards not found by ID:', notFound);
    }

    // Check for entries with missing/empty scryfall IDs
    const entriesWithoutId = cardEntries.filter(e => !e.scryfallId);
    if (entriesWithoutId.length > 0) {
      console.warn('Entries missing Scryfall ID:', entriesWithoutId.map(e => e.name));
    }

    // Build card map by Scryfall ID
    const cardMap = new Map(cards.map((c) => [c.id, c]));

    // Fallback: fuzzy lookup for entries with missing IDs or IDs not found
    const missingEntries = cardEntries.filter(
      (e) => !e.scryfallId || !cardMap.has(e.scryfallId)
    );

    // Track converted and not found cards
    const convertedCards: Array<{ original: string; converted: string }> = [];
    const notFoundCards: string[] = [];

    if (missingEntries.length > 0) {
      console.log('Attempting fuzzy lookup for missing cards:', missingEntries.map((e) => e.name));

      // Map to store fuzzy-matched cards by their original entry name
      const fuzzyMatches = new Map<string, Card>();

      for (const entry of missingEntries) {
        const result = await getCardByFuzzyName(entry.name);
        if (result) {
          console.log(`Fuzzy match: "${entry.name}" -> "${result.card.name}"`);
          fuzzyMatches.set(entry.name.toLowerCase(), result.card);
          // Track the conversion
          convertedCards.push({ original: entry.name, converted: result.card.name });
          // Also add to cardMap by the card's ID for consistency
          cardMap.set(result.card.id, result.card);
        } else {
          console.warn(`Could not find card: "${entry.name}"`);
          notFoundCards.push(entry.name);
        }
      }

      // Update missing entries with their fuzzy-matched Scryfall IDs
      for (const entry of missingEntries) {
        const match = fuzzyMatches.get(entry.name.toLowerCase());
        if (match) {
          entry.scryfallId = match.id;
        }
      }
    }

    // Fill in missing prices by looking up cheapest printings
    const cardsWithoutPrices = Array.from(cardMap.values()).filter(
      (card) => !card.prices?.usd
    );

    if (cardsWithoutPrices.length > 0) {
      console.log(`Looking up prices for ${cardsWithoutPrices.length} cards without price data...`);

      for (const card of cardsWithoutPrices) {
        const cheapestPrice = await getCheapestPrice(card.name);
        if (cheapestPrice) {
          card.prices = { ...card.prices, usd: cheapestPrice };
          console.log(`Set price for ${card.name}: $${cheapestPrice}`);
        }
      }
    }

    const commanders = cardEntries
      .filter((e) => e.board === 'commanders')
      .map((entry) => cardMap.get(entry.scryfallId))
      .filter((c): c is NonNullable<typeof c> => c !== undefined);

    const buildDeckCards = (board: DeckCard['board']): DeckCard[] => {
      return cardEntries
        .filter((e) => e.board === board)
        .map((entry) => {
          const card = cardMap.get(entry.scryfallId);
          if (!card) {
            console.warn(`Card not found: "${entry.name}" (ID: ${entry.scryfallId})`);
            return null;
          }
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
      mainboard: buildDeckCards('mainboard'),
      sideboard: buildDeckCards('sideboard'),
      maybeboard: buildDeckCards('maybeboard'),
      moxfieldId: moxfieldDeck.id,
      moxfieldUrl: `https://www.moxfield.com/decks/${moxfieldDeck.publicId}`,
      importedAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
    };

    const stats = calculateDeckStats(deck);

    // Build response with appropriate warnings/info
    const warnings: string[] = [];
    const info: string[] = [];

    // Cards converted from alternate printings (fuzzy matched)
    if (convertedCards.length > 0) {
      info.push(
        `${convertedCards.length} card${convertedCards.length > 1 ? 's' : ''} converted to original printing: ${convertedCards.map((c) => `${c.original} → ${c.converted}`).join(', ')}`
      );
    }

    // Cards truly not found
    if (notFoundCards.length > 0) {
      warnings.push(
        `${notFoundCards.length} card${notFoundCards.length > 1 ? 's' : ''} not found: ${notFoundCards.join(', ')}`
      );
    }

    const response: {
      deck: Deck;
      stats: typeof stats;
      warnings?: string[];
      info?: string[];
    } = {
      deck,
      stats,
    };

    if (warnings.length > 0) {
      response.warnings = warnings;
    }
    if (info.length > 0) {
      response.info = info;
    }

    return NextResponse.json(response);
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
