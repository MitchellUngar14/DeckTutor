import type { ComboCheckRequest, ComboCheckResponse, DeckCombo, PotentialCombo, Combo } from '@/types';

const COMMANDER_SPELLBOOK_API = 'https://backend.commanderspellbook.com';

export class ComboServiceError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ComboServiceError';
  }
}

interface SpellbookCard {
  card: {
    name: string;
  };
}

interface SpellbookFeature {
  feature: {
    name: string;
  };
}

interface SpellbookCombo {
  id: string;
  uses: SpellbookCard[];
  produces: SpellbookFeature[];
  otherPrerequisites?: string;
  description?: string;
  identity?: string;
}

interface SpellbookResults {
  included: SpellbookCombo[];
  includedByChangingCommanders: SpellbookCombo[];
  almostIncluded: SpellbookCombo[];
  almostIncludedByAddingColors: SpellbookCombo[];
}

interface SpellbookResponse {
  count: number;
  results: SpellbookResults;
}

export async function checkCombos(request: ComboCheckRequest): Promise<ComboCheckResponse> {
  const startTime = Date.now();
  const deckCardsLower = new Set(request.cards.map(c => c.toLowerCase()));

  const foundCombos: Map<string, DeckCombo> = new Map();
  const potentialCombos: Map<string, PotentialCombo> = new Map();

  try {
    // API expects: { commanders: [], main: [{card: "Name"}, ...] }
    const requestBody = {
      commanders: request.commander ? [{ card: request.commander }] : [],
      main: request.cards.map(name => ({ card: name })),
    };

    const response = await fetch(`${COMMANDER_SPELLBOOK_API}/find-my-combos/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new ComboServiceError(
        `Commander Spellbook API error: ${response.status}`,
        response.status
      );
    }

    const data: SpellbookResponse = await response.json();
    const results = data.results;

    // Debug logging
    console.log('Commander Spellbook response:', {
      count: data.count,
      included: results.included?.length || 0,
      includedByChangingCommanders: results.includedByChangingCommanders?.length || 0,
      almostIncluded: results.almostIncluded?.length || 0,
      almostIncludedByAddingColors: results.almostIncludedByAddingColors?.length || 0,
    });

    if (results.almostIncludedByAddingColors?.length > 0) {
      const first = results.almostIncludedByAddingColors[0];
      console.log('First almostIncludedByAddingColors combo:', {
        id: first.id,
        cards: first.uses?.map(u => u.card?.name),
      });
    }

    // Helper function to process a combo
    const processCombo = (comboData: SpellbookCombo, isComplete: boolean) => {
      const comboId = String(comboData.id);
      if (!comboId) return;

      // Get card names from the combo
      const comboCards = (comboData.uses || [])
        .map(u => u.card?.name)
        .filter((name): name is string => !!name);

      if (comboCards.length < 2) return;

      // Check which cards are in the deck
      const present = comboCards.filter(c => deckCardsLower.has(c.toLowerCase()));
      const missing = comboCards.filter(c => !deckCardsLower.has(c.toLowerCase()));

      // Get combo result/effect
      const resultParts = (comboData.produces || [])
        .map(p => p.feature?.name)
        .filter((name): name is string => !!name);
      const result = resultParts.length > 0 ? resultParts.join(', ') : 'Combo effect';

      // Get steps
      const steps = comboData.description
        ? comboData.description.split('\n').map(s => s.trim()).filter(s => s)
        : [];

      // Get color identity
      const colorIdentity = comboData.identity
        ? comboData.identity.toUpperCase().split('')
        : [];

      const sourceUrl = `https://commanderspellbook.com/combo/${comboId}`;

      if (isComplete) {
        // Complete combo
        if (!foundCombos.has(comboId)) {
          const combo: Combo = {
            id: comboId,
            cards: comboCards,
            description: result,
            prerequisite: comboData.otherPrerequisites || undefined,
            steps,
            result,
            colorIdentity,
            sourceUrl,
          };

          foundCombos.set(comboId, {
            combo,
            isComplete: true,
            presentCards: present,
            missingCards: [],
          });
        }
      } else if (present.length >= 2) {
        // Potential combo
        if (!potentialCombos.has(comboId) && !foundCombos.has(comboId)) {
          potentialCombos.set(comboId, {
            cards: present,
            missingPieces: missing,
            description: result,
            sourceUrl,
          });
        }
      }
    };

    // Process complete combos (included in deck)
    for (const combo of results.included || []) {
      processCombo(combo, true);
    }

    // Also check includedByChangingCommanders as complete combos
    for (const combo of results.includedByChangingCommanders || []) {
      processCombo(combo, true);
    }

    // Process potential combos (almost included)
    for (const combo of results.almostIncluded || []) {
      processCombo(combo, false);
    }

    // Also check almostIncludedByAddingColors as potential combos
    for (const combo of results.almostIncludedByAddingColors || []) {
      processCombo(combo, false);
    }
  } catch (error) {
    if (error instanceof ComboServiceError) throw error;
    console.error('Commander Spellbook API error:', error);
    throw new ComboServiceError('Failed to fetch combos from Commander Spellbook', 502);
  }

  const processingTime = Date.now() - startTime;

  return {
    combos: Array.from(foundCombos.values()),
    potentialCombos: Array.from(potentialCombos.values()).slice(0, 20),
    analyzedCards: request.cards.length,
    processingTime,
  };
}

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${COMMANDER_SPELLBOOK_API}/`, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}
