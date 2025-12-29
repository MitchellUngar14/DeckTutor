import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getCardsInBulk, getCardByFuzzyName, getCheapestPrice } from '@/lib/clients/scryfall';
import { calculateDeckStats, type Deck, type DeckCard } from '@/types';

interface ParsedCard {
  name: string;
  quantity: number;
  board: DeckCard['board'];
}

function parseDeckList(text: string): ParsedCard[] {
  const lines = text.split('\n');
  const cards: ParsedCard[] = [];
  let currentBoard: DeckCard['board'] = 'mainboard';

  // Moxfield format: main deck, then blank line, then commander(s) at the end
  // First, let's find sections separated by blank lines
  const sections: string[][] = [];
  let currentSection: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentSection.length > 0) {
        sections.push(currentSection);
        currentSection = [];
      }
    } else {
      currentSection.push(trimmed);
    }
  }
  if (currentSection.length > 0) {
    sections.push(currentSection);
  }

  // If we have multiple sections, the last section (1-2 cards) is likely the commander
  // Moxfield puts commander at the end after a blank line
  let commanderSection: string[] = [];
  let mainSection: string[] = [];

  if (sections.length >= 2) {
    const lastSection = sections[sections.length - 1];
    // Commander section typically has 1-2 cards (commander + maybe partner)
    if (lastSection.length <= 2) {
      commanderSection = lastSection;
      mainSection = sections.slice(0, -1).flat();
    } else {
      mainSection = sections.flat();
    }
  } else {
    mainSection = sections.flat();
  }

  // Parse helper function
  const parseCardLine = (line: string): { name: string; quantity: number; isCommander?: boolean } | null => {
    const trimmed = line.trim();

    // Handle section headers (skip them)
    const isHeader = trimmed.startsWith('//') ||
                     trimmed.startsWith('#') ||
                     /^[A-Z]+:$/.test(trimmed) ||
                     /^[A-Z][A-Z\s]+:$/.test(trimmed);

    if (isHeader) {
      return null;
    }

    // Check for commander tags: *CMDR*, *Commander*, #!Commander
    const isCommander = /\*CMDR\*|\*Commander\*|#!Commander/i.test(trimmed);

    // Parse card line: "1 Sol Ring", "1x Sol Ring", "1 Sol Ring *CMDR*"
    const match = trimmed.match(/^(\d+)x?\s+(.+?)(?:\s+\([^)]+\).*)?$/i);

    if (match) {
      const quantity = parseInt(match[1], 10);
      let name = match[2].trim();
      // Remove set codes like (NEO) 123
      name = name.replace(/\s+\([^)]+\)\s*\d*$/, '').trim();
      // Remove commander tags
      name = name.replace(/\s*\*CMDR\*\s*/gi, '').trim();
      name = name.replace(/\s*\*Commander\*\s*/gi, '').trim();
      name = name.replace(/\s*#!Commander\s*/gi, '').trim();
      // Remove stray asterisks
      name = name.replace(/^\*+|\*+$/g, '').trim();

      if (name && quantity > 0) {
        return { name, quantity, isCommander };
      }
    }

    return null;
  };

  // Parse commander section
  for (const line of commanderSection) {
    const parsed = parseCardLine(line);
    if (parsed) {
      cards.push({ ...parsed, board: 'commanders' });
    }
  }

  // Parse main section
  for (const line of mainSection) {
    const lowerLine = line.toLowerCase();

    // Check for inline section headers
    if (line.startsWith('//') || line.startsWith('#') || /^[A-Z]+:$/.test(line)) {
      const header = lowerLine.replace(/^[/#]+\s*/, '').replace(/:$/, '');
      if (header.includes('commander')) {
        currentBoard = 'commanders';
      } else if (header.includes('sideboard')) {
        currentBoard = 'sideboard';
      } else if (header.includes('maybe') || header.includes('considering')) {
        currentBoard = 'maybeboard';
      } else {
        currentBoard = 'mainboard';
      }
      continue;
    }

    const parsed = parseCardLine(line);
    if (parsed) {
      // If card has *CMDR* tag, treat it as a commander regardless of section
      const board = parsed.isCommander ? 'commanders' : currentBoard;
      cards.push({ name: parsed.name, quantity: parsed.quantity, board });
    }
  }

  return cards;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deckText, deckName } = body;

    if (!deckText || typeof deckText !== 'string') {
      return NextResponse.json(
        { error: 'MISSING_TEXT', message: 'Deck text is required' },
        { status: 400 }
      );
    }

    // Parse the deck list
    const parsedCards = parseDeckList(deckText);

    if (parsedCards.length === 0) {
      return NextResponse.json(
        { error: 'NO_CARDS', message: 'No valid cards found in deck list' },
        { status: 400 }
      );
    }

    // Get unique card names for Scryfall lookup
    const uniqueNames = [...new Set(parsedCards.map((c) => c.name))];

    // Fetch card data from Scryfall
    const { cards, notFound } = await getCardsInBulk(
      uniqueNames.map((name) => ({ name }))
    );

    if (cards.length === 0) {
      return NextResponse.json(
        { error: 'NO_CARDS_FOUND', message: 'None of the cards could be found' },
        { status: 400 }
      );
    }

    console.log('=== DEBUG: Text Import ===');
    console.log('Parsed cards:', parsedCards.length);
    console.log('Unique names:', uniqueNames.length);
    console.log('Cards from Scryfall:', cards.length);
    console.log('Not found:', notFound);

    // Build card lookup map with multiple name variations
    const cardMap = new Map<string, typeof cards[0]>();
    for (const card of cards) {
      // Map by exact Scryfall name (lowercase)
      cardMap.set(card.name.toLowerCase(), card);

      // For split/double-faced cards (e.g., "Dead // Gone"), also map by variations
      if (card.name.includes(' // ')) {
        const [firstHalf, secondHalf] = card.name.split(' // ');
        // Map by first half only
        cardMap.set(firstHalf.toLowerCase(), card);
        // Map by second half only
        cardMap.set(secondHalf.toLowerCase(), card);
        // Map by common separator variations
        cardMap.set(`${firstHalf}/${secondHalf}`.toLowerCase(), card);
        cardMap.set(`${firstHalf} / ${secondHalf}`.toLowerCase(), card);
      }
    }

    console.log('CardMap entries:', cardMap.size);

    // Find cards that won't match in the cardMap and try fuzzy lookup
    const potentiallyMissing = parsedCards.filter(
      (p) => !cardMap.has(p.name.toLowerCase())
    );

    // Track cards converted via fuzzy search (alternate printings)
    const convertedCards: Array<{ original: string; converted: string }> = [];

    if (potentiallyMissing.length > 0) {
      console.log('Attempting fuzzy lookup for:', potentiallyMissing.map((p) => p.name));

      // Fuzzy lookup for alternate-named cards (Secret Lair, promos, etc.)
      for (const parsed of potentiallyMissing) {
        const result = await getCardByFuzzyName(parsed.name);
        if (result) {
          console.log(`Fuzzy match: "${parsed.name}" -> "${result.card.name}"`);
          // Track the conversion
          convertedCards.push({ original: parsed.name, converted: result.card.name });
          // Map the alternate name to the found card
          cardMap.set(parsed.name.toLowerCase(), result.card);
          // Also add the canonical name if not already present
          if (!cardMap.has(result.card.name.toLowerCase())) {
            cardMap.set(result.card.name.toLowerCase(), result.card);
          }
        }
      }

      console.log('CardMap entries after fuzzy lookup:', cardMap.size);
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

    // Group parsed cards by board
    const commanders: DeckCard[] = [];
    const mainboard: DeckCard[] = [];
    const sideboard: DeckCard[] = [];
    const maybeboard: DeckCard[] = [];

    const unmatchedCards: string[] = [];
    for (const parsed of parsedCards) {
      const card = cardMap.get(parsed.name.toLowerCase());
      if (!card) {
        unmatchedCards.push(parsed.name);
        continue;
      }

      const deckCard: DeckCard = {
        card,
        quantity: parsed.quantity,
        board: parsed.board,
      };

      switch (parsed.board) {
        case 'commanders':
          commanders.push(deckCard);
          break;
        case 'sideboard':
          sideboard.push(deckCard);
          break;
        case 'maybeboard':
          maybeboard.push(deckCard);
          break;
        default:
          mainboard.push(deckCard);
      }
    }

    if (unmatchedCards.length > 0) {
      console.log('Unmatched cards (not in cardMap):', unmatchedCards);
    }

    // Extract commander cards for the deck structure
    const commanderCards = commanders.map((dc) => dc.card);

    // Generate deck name from commander if not provided
    const generatedName = commanderCards.length > 0
      ? `${commanderCards.map(c => c.name.split(',')[0]).join(' & ')} Deck`
      : 'Commander Deck';

    const deck: Deck = {
      id: nanoid(),
      name: deckName || generatedName,
      format: 'commander',
      commanders: commanderCards,
      mainboard,
      sideboard,
      maybeboard,
      importedAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
    };

    const stats = calculateDeckStats(deck);

    // Build response with appropriate warnings
    const warnings: string[] = [];
    const info: string[] = [];

    // Cards converted from alternate printings (fuzzy matched)
    if (convertedCards.length > 0) {
      info.push(
        `${convertedCards.length} card${convertedCards.length > 1 ? 's' : ''} converted to original printing: ${convertedCards.map((c) => `${c.original} → ${c.converted}`).join(', ')}`
      );
    }

    // Cards truly not found (after all lookup attempts)
    if (unmatchedCards.length > 0) {
      warnings.push(
        `${unmatchedCards.length} card${unmatchedCards.length > 1 ? 's' : ''} not found: ${unmatchedCards.join(', ')}`
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
    console.error('Text import error:', error);

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to import deck' },
      { status: 500 }
    );
  }
}
