import type { ScryfallCard, Card } from '@/types';
import { mapScryfallCard } from '@/types';

const SCRYFALL_API = 'https://api.scryfall.com';
const RATE_LIMIT_MS = 100;

let lastRequestTime = 0;

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

  const response = await fetch(
    `${SCRYFALL_API}/cards/named?exact=${encodeURIComponent(name)}`,
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

  // Scryfall allows max 75 cards per request
  const chunks: BulkCardIdentifier[][] = [];
  for (let i = 0; i < identifiers.length; i += 75) {
    chunks.push(identifiers.slice(i, i + 75));
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

  const response = await fetch(
    `${SCRYFALL_API}/cards/search?q=${encodeURIComponent(query)}&unique=cards`,
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
