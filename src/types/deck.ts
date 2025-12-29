import type { Card, DeckCard } from './card';

export interface Deck {
  id: string;
  name: string;
  description?: string;
  format: 'commander' | 'modern' | 'standard' | 'legacy' | 'vintage' | 'pauper';
  commanders: Card[];
  mainboard: DeckCard[];
  sideboard: DeckCard[];
  maybeboard: DeckCard[];
  moxfieldId?: string;
  moxfieldUrl?: string;
  importedAt: string;
  lastModifiedAt: string;
}

export interface DeckStats {
  cardCount: number;
  averageCmc: number;
  colorDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
  manaCurve: Record<number, number>;
}

export interface ImportDeckRequest {
  moxfieldUrl: string;
}

export interface ImportDeckResponse {
  deck: Deck;
  stats: DeckStats;
}

export interface MoxfieldDeck {
  id: string;
  name: string;
  description: string;
  format: string;
  publicId: string;
  mainboard: Record<string, MoxfieldCard>;
  sideboard: Record<string, MoxfieldCard>;
  maybeboard: Record<string, MoxfieldCard>;
  commanders: Record<string, MoxfieldCard>;
}

export interface MoxfieldCard {
  quantity: number;
  card: {
    name: string;
    scryfall_id: string;
  };
}

export function calculateDeckStats(deck: Deck): DeckStats {
  const allCards = [
    ...deck.mainboard,
    ...deck.commanders.map(c => ({ card: c, quantity: 1, board: 'commanders' as const })),
  ];

  let totalCmc = 0;
  let nonLandCount = 0;
  const colorDistribution: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  const typeDistribution: Record<string, number> = {};
  const manaCurve: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };

  for (const { card, quantity } of allCards) {
    // Type distribution
    const mainType = card.typeLine.split(' — ')[0].split(' ').pop() || 'Other';
    typeDistribution[mainType] = (typeDistribution[mainType] || 0) + quantity;

    // Skip lands for CMC calculations
    if (!card.typeLine.toLowerCase().includes('land')) {
      totalCmc += card.cmc * quantity;
      nonLandCount += quantity;

      // Mana curve (cap at 7+)
      const cmcBucket = Math.min(Math.floor(card.cmc), 7);
      manaCurve[cmcBucket] = (manaCurve[cmcBucket] || 0) + quantity;
    }

    // Color distribution based on color identity
    for (const color of card.colorIdentity) {
      colorDistribution[color] = (colorDistribution[color] || 0) + quantity;
    }
    if (card.colorIdentity.length === 0) {
      colorDistribution['C'] = (colorDistribution['C'] || 0) + quantity;
    }
  }

  return {
    cardCount: allCards.reduce((sum, c) => sum + c.quantity, 0),
    averageCmc: nonLandCount > 0 ? totalCmc / nonLandCount : 0,
    colorDistribution,
    typeDistribution,
    manaCurve,
  };
}
