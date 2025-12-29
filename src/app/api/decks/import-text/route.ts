import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getCardsInBulk } from '@/lib/clients/scryfall';
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
  const parseCardLine = (line: string): { name: string; quantity: number } | null => {
    const trimmed = line.trim();

    // Handle section headers (skip them)
    const lowerLine = trimmed.toLowerCase();
    const isHeader = trimmed.startsWith('//') ||
                     trimmed.startsWith('#') ||
                     /^[A-Z]+:$/.test(trimmed) ||
                     /^[A-Z][A-Z\s]+:$/.test(trimmed);

    if (isHeader) {
      return null;
    }

    // Parse card line: "1 Sol Ring", "1x Sol Ring"
    const match = trimmed.match(/^(\d+)x?\s+(.+?)(?:\s+\([^)]+\).*)?$/i);

    if (match) {
      const quantity = parseInt(match[1], 10);
      let name = match[2].trim();
      name = name.replace(/\s+\([^)]+\)\s*\d*$/, '').trim();
      name = name.replace(/^\*+|\*+$/g, '').trim();

      if (name && quantity > 0) {
        return { name, quantity };
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
      cards.push({ ...parsed, board: currentBoard });
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

    if (notFound.length > 0) {
      console.warn('Cards not found:', notFound);
    }

    // Build card lookup map
    const cardMap = new Map(cards.map((c) => [c.name.toLowerCase(), c]));

    // Group parsed cards by board
    const commanders: DeckCard[] = [];
    const mainboard: DeckCard[] = [];
    const sideboard: DeckCard[] = [];
    const maybeboard: DeckCard[] = [];

    for (const parsed of parsedCards) {
      const card = cardMap.get(parsed.name.toLowerCase());
      if (!card) continue;

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

    // Include info about cards that weren't found
    const response: { deck: Deck; stats: typeof stats; warnings?: string[] } = {
      deck,
      stats,
    };

    if (notFound.length > 0) {
      response.warnings = notFound.map((name) => `Card not found: ${name}`);
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
