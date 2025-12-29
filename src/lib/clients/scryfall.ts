import type { ScryfallCard, Card } from '@/types';
import { mapScryfallCard } from '@/types';

const SCRYFALL_API = 'https://api.scryfall.com';
const RATE_LIMIT_MS = 100;

let lastRequestTime = 0;

/**
 * Normalize card names for Scryfall API.
 * Split cards (e.g., "Dead/Gone") need special handling.
 * Scryfall's collection API works best with just the first half of split card names.
 */
function normalizeCardName(name: string): string {
  // Handle split card names: "Dead/Gone" or "Dead // Gone" -> just "Dead"
  // Scryfall collection API finds split cards by either half
  if (name.includes('//')) {
    return name.split('//')[0].trim();
  }
  if (name.includes('/')) {
    return name.split('/')[0].trim();
  }
  return name;
}

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, RATE_LIMIT_MS - timeSinceLastRequest)
    );
  }
  lastRequestTime = Date.now();
}

export class ScryfallError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ScryfallError';
  }
}

export async function getCardByName(name: string): Promise<Card> {
  await rateLimit();

  const normalizedName = normalizeCardName(name);
  const response = await fetch(
    `${SCRYFALL_API}/cards/named?exact=${encodeURIComponent(normalizedName)}`,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'DeckTutor/1.0',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new ScryfallError(`Card not found: ${name}`, 404);
    }
    throw new ScryfallError(`Scryfall API error: ${response.status}`, response.status);
  }

  const data: ScryfallCard = await response.json();
  return mapScryfallCard(data);
}

/**
 * Fuzzy search for a card by name.
 * Handles alternate card names (Secret Lair, promos, etc.) by using Scryfall's fuzzy matching.
 * Returns the card with its canonical Oracle name, plus the original query name for mapping.
 */
export async function getCardByFuzzyName(name: string): Promise<{ card: Card; queryName: string } | null> {
  await rateLimit();

  const response = await fetch(
    `${SCRYFALL_API}/cards/named?fuzzy=${encodeURIComponent(name)}`,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'DeckTutor/1.0',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    // For other errors, just return null to avoid breaking the import
    console.warn(`Fuzzy search failed for "${name}": ${response.status}`);
    return null;
  }

  const data: ScryfallCard = await response.json();
  return { card: mapScryfallCard(data), queryName: name };
}

export async function getCardById(id: string): Promise<Card> {
  await rateLimit();

  const response = await fetch(`${SCRYFALL_API}/cards/${id}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'DeckTutor/1.0',
    },
  });

  if (!response.ok) {
    throw new ScryfallError(`Scryfall API error: ${response.status}`, response.status);
  }

  const data: ScryfallCard = await response.json();
  return mapScryfallCard(data);
}

interface BulkCardIdentifier {
  name?: string;
  id?: string;
}

export async function getCardsInBulk(identifiers: BulkCardIdentifier[]): Promise<{
  cards: Card[];
  notFound: string[];
}> {
  await rateLimit();

  // Normalize card names for split cards
  const normalizedIdentifiers = identifiers.map((id) => ({
    ...id,
    name: id.name ? normalizeCardName(id.name) : undefined,
  }));

  // Scryfall allows max 75 cards per request
  const chunks: BulkCardIdentifier[][] = [];
  for (let i = 0; i < normalizedIdentifiers.length; i += 75) {
    chunks.push(normalizedIdentifiers.slice(i, i + 75));
  }

  const allCards: Card[] = [];
  const notFound: string[] = [];

  for (const chunk of chunks) {
    await rateLimit();

    const response = await fetch(`${SCRYFALL_API}/cards/collection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'DeckTutor/1.0',
      },
      body: JSON.stringify({ identifiers: chunk }),
    });

    if (!response.ok) {
      throw new ScryfallError(`Scryfall API error: ${response.status}`, response.status);
    }

    const data = await response.json();

    for (const card of data.data) {
      allCards.push(mapScryfallCard(card));
    }

    if (data.not_found) {
      for (const item of data.not_found) {
        notFound.push(item.name || item.id);
      }
    }
  }

  return { cards: allCards, notFound };
}

export async function searchCards(query: string, limit = 20): Promise<Card[]> {
  await rateLimit();

  const normalizedQuery = normalizeCardName(query);
  const response = await fetch(
    `${SCRYFALL_API}/cards/search?q=${encodeURIComponent(normalizedQuery)}&unique=cards`,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'DeckTutor/1.0',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    throw new ScryfallError(`Scryfall API error: ${response.status}`, response.status);
  }

  const data = await response.json();
  return data.data.slice(0, limit).map(mapScryfallCard);
}

/**
 * Get the cheapest USD price for a card by searching all printings.
 * Used to fill in missing price data during import.
 */
export async function getCheapestPrice(cardName: string): Promise<string | null> {
  await rateLimit();

  try {
    const encodedName = encodeURIComponent(`!"${cardName}"`);
    const response = await fetch(
      `${SCRYFALL_API}/cards/search?q=${encodedName}&unique=prints`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'DeckTutor/1.0',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    let cheapest: number | null = null;

    for (const card of data.data || []) {
      const priceStr = card.prices?.usd;
      if (priceStr) {
        const price = parseFloat(priceStr);
        if (!isNaN(price) && price > 0) {
          if (cheapest === null || price < cheapest) {
            cheapest = price;
          }
        }
      }
    }

    return cheapest !== null ? cheapest.toFixed(2) : null;
  } catch (error) {
    console.error(`Error fetching cheapest price for ${cardName}:`, error);
    return null;
  }
}

export async function autocomplete(query: string): Promise<string[]> {
  if (query.length < 2) return [];

  const response = await fetch(
    `${SCRYFALL_API}/cards/autocomplete?q=${encodeURIComponent(query)}`,
    {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'DeckTutor/1.0',
      },
    }
  );

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data.data;
}
