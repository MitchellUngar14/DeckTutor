import type { MoxfieldDeck } from '@/types';

const MOXFIELD_API = 'https://api.moxfield.com';

export class MoxfieldError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'MoxfieldError';
  }
}

export function extractDeckId(url: string): string | null {
  // Handle various Moxfield URL formats:
  // https://www.moxfield.com/decks/abc123
  // https://moxfield.com/decks/abc123
  // abc123 (just the ID)

  if (!url.includes('/')) {
    // Assume it's just the deck ID
    return url.trim();
  }

  const patterns = [
    /moxfield\.com\/decks\/([a-zA-Z0-9_-]+)/,
    /\/decks\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

export async function getDeck(deckId: string): Promise<MoxfieldDeck> {
  const response = await fetch(`${MOXFIELD_API}/v2/decks/all/${deckId}`, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new MoxfieldError('Deck not found. Make sure the deck is public.', 404);
    }
    throw new MoxfieldError(`Moxfield API error: ${response.status}`, response.status);
  }

  const data = await response.json();

  return {
    id: data.id,
    name: data.name,
    description: data.description || '',
    format: data.format,
    publicId: data.publicId,
    mainboard: data.mainboard || {},
    sideboard: data.sideboard || {},
    maybeboard: data.maybeboard || {},
    commanders: data.commanders || {},
  };
}

export function getDeckUrl(publicId: string): string {
  return `https://www.moxfield.com/decks/${publicId}`;
}

export function formatDeckForExport(deck: {
  mainboard: Array<{ name: string; quantity: number }>;
  sideboard?: Array<{ name: string; quantity: number }>;
  commanders?: Array<{ name: string; quantity: number }>;
}): string {
  const lines: string[] = [];

  // Commanders first
  if (deck.commanders && deck.commanders.length > 0) {
    lines.push('// Commanders');
    for (const card of deck.commanders) {
      lines.push(`${card.quantity} ${card.name}`);
    }
    lines.push('');
  }

  // Mainboard
  if (deck.mainboard.length > 0) {
    lines.push('// Mainboard');
    for (const card of deck.mainboard) {
      lines.push(`${card.quantity} ${card.name}`);
    }
  }

  // Sideboard
  if (deck.sideboard && deck.sideboard.length > 0) {
    lines.push('');
    lines.push('// Sideboard');
    for (const card of deck.sideboard) {
      lines.push(`${card.quantity} ${card.name}`);
    }
  }

  return lines.join('\n');
}
