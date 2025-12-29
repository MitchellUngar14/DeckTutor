import { NextResponse } from 'next/server';

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

interface CardPriceRequest {
  oracleId: string;
  name: string;
  quantity: number;
  currentPrice: number; // Price from the deck's current printing
}

interface PrintingPrice {
  set: string;
  price: number;
}

async function getCheapestPrinting(oracleId: string, cardName: string): Promise<number | null> {
  await rateLimit();

  try {
    // Search for all printings by exact card name (more reliable than oracle_id)
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
      console.log(`No printings found for: ${cardName}`);
      return null;
    }

    const data = await response.json();

    // Find the cheapest USD price among all printings
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

    return cheapest;
  } catch (error) {
    console.error(`Error fetching printings for ${cardName}:`, error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cards } = body as { cards: CardPriceRequest[] };

    if (!cards || !Array.isArray(cards)) {
      return NextResponse.json(
        { error: 'Cards array is required' },
        { status: 400 }
      );
    }

    // Group by oracle ID to avoid duplicate lookups
    const uniqueCards = new Map<string, { name: string; totalQuantity: number; currentPrice: number }>();

    for (const card of cards) {
      const existing = uniqueCards.get(card.oracleId);
      if (existing) {
        existing.totalQuantity += card.quantity;
        // Use the max current price if same card appears multiple times
        existing.currentPrice = Math.max(existing.currentPrice, card.currentPrice);
      } else {
        uniqueCards.set(card.oracleId, {
          name: card.name,
          totalQuantity: card.quantity,
          currentPrice: card.currentPrice,
        });
      }
    }

    let totalCheapest = 0;
    const cardPrices: Array<{ name: string; cheapestPrice: number | null; currentPrice: number }> = [];

    // Fetch cheapest price for each unique card
    for (const [oracleId, { name, totalQuantity, currentPrice }] of uniqueCards) {
      const cheapestPrice = await getCheapestPrinting(oracleId, name);

      cardPrices.push({ name, cheapestPrice, currentPrice });

      if (cheapestPrice !== null) {
        // Use the cheaper of: cheapest printing found OR current price (if available)
        const priceToUse = currentPrice > 0
          ? Math.min(cheapestPrice, currentPrice)
          : cheapestPrice;
        totalCheapest += priceToUse * totalQuantity;
      } else if (currentPrice > 0) {
        // No cheapest found, use current price
        totalCheapest += currentPrice * totalQuantity;
      }
    }

    return NextResponse.json({
      cheapestValue: totalCheapest,
      cardCount: uniqueCards.size,
    });
  } catch (error) {
    console.error('Cheapest value error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate cheapest value' },
      { status: 500 }
    );
  }
}
