import { NextResponse } from 'next/server';

const SCRYFALL_API = 'https://api.scryfall.com';

// Scryfall search queries for each synergy type (without color filter - added dynamically)
const SYNERGY_QUERIES: Record<string, string> = {
  sacrifice: 'o:"sacrifice a creature" OR o:"whenever a creature dies" OR o:"sacrifice another"',
  tokens: 'o:"create a" o:token',
  counters: 'o:"+1/+1 counter"',
  graveyard: 'o:"from your graveyard" OR o:"in your graveyard" OR o:flashback OR o:unearth',
  artifacts: '(o:"artifact you control" OR o:"artifacts you control" OR o:affinity)',
  enchantments: '(o:"enchantment you control" OR o:constellation)',
  lands: '(o:landfall OR o:"whenever a land enters")',
  spellslinger: '(o:"whenever you cast an instant" OR o:"whenever you cast a sorcery" OR o:magecraft)',
  voltron: '(t:equipment OR (t:aura o:"enchant creature"))',
  draw: 'o:"draw a card" o:"whenever you"',
  ramp: '(o:"add {" t:creature OR o:"search your library for a basic land")',
  // Commander synergy - cards that are generally good with commanders (attack triggers, ETB, etc.)
  commander: '(o:"whenever your commander" OR o:"commander you control" OR o:"command zone")',
};

// Tribal queries use creature type search
function getTribalQuery(tribe: string): string {
  return `(t:${tribe.toLowerCase()} OR o:"${tribe}s you control" OR o:"other ${tribe}")`;
}

// Keyword queries search for cards with that keyword
function getKeywordQuery(keyword: string): string {
  return `keyword:${keyword.toLowerCase()}`;
}

// Build color identity filter for Scryfall
// Format: id<=WUBRG (cards whose identity is a subset of the given colors)
function getColorIdentityFilter(colorIdentity: string[]): string {
  if (!colorIdentity || colorIdentity.length === 0) {
    // Colorless commander - only colorless cards allowed
    return 'id:c';
  }
  // id<= means "identity is subset of these colors"
  return `id<=${colorIdentity.join('').toUpperCase()}`;
}

interface ScryfallCard {
  name: string;
  edhrec_rank?: number;
}

interface ScryfallSearchResponse {
  data?: ScryfallCard[];
  has_more?: boolean;
  next_page?: string;
}

async function searchScryfall(query: string): Promise<string[]> {
  try {
    // Add sorting by EDHREC rank (popularity in Commander)
    const url = `${SCRYFALL_API}/cards/search?q=${encodeURIComponent(query)}&order=edhrec&dir=asc`;

    console.log('Scryfall query URL:', url);

    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'DeckTutor/1.0' },
    });

    if (!response.ok) {
      // 404 means no cards found - that's okay, return empty
      if (response.status === 404) {
        console.log('No cards found for query:', query);
        return [];
      }
      const errorText = await response.text();
      console.error(`Scryfall search failed for query: ${query}`, response.status, errorText);
      return [];
    }

    const data: ScryfallSearchResponse = await response.json();

    // Return top cards sorted by EDHREC rank
    return (data.data || [])
      .slice(0, 20) // Get top 20 results
      .map(card => card.name);
  } catch (error) {
    console.error('Scryfall search error:', error);
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { synergyType, tribe, keyword, deckCards, colorIdentity } = body;

    if (!synergyType) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'synergyType is required' },
        { status: 400 }
      );
    }

    // Get the appropriate base query
    let baseQuery: string | undefined;
    if (synergyType === 'tribal' && tribe) {
      baseQuery = getTribalQuery(tribe);
    } else if (synergyType === 'keyword' && keyword) {
      baseQuery = getKeywordQuery(keyword);
    } else {
      baseQuery = SYNERGY_QUERIES[synergyType];
    }

    if (!baseQuery) {
      // Return empty suggestions for unknown synergy types instead of error
      console.log(`No query defined for synergy type: ${synergyType}, returning empty suggestions`);
      return NextResponse.json({
        suggestions: [],
        synergyType,
        tribe,
        keyword,
      });
    }

    // Build the full query with color identity and format filters
    const colorFilter = getColorIdentityFilter(colorIdentity || []);
    const query = `(${baseQuery}) ${colorFilter} f:commander`;

    console.log('Synergy suggestions request:', {
      synergyType,
      tribe,
      colorIdentity,
      colorFilter,
      fullQuery: query,
    });

    // Fetch suggestions from Scryfall
    const allSuggestions = await searchScryfall(query);

    // Filter out cards already in the deck
    const deckCardsLower = new Set((deckCards || []).map((c: string) => c.toLowerCase()));
    const suggestions = allSuggestions.filter(
      name => !deckCardsLower.has(name.toLowerCase())
    );

    return NextResponse.json({
      suggestions: suggestions.slice(0, 8), // Return top 8 suggestions
      synergyType,
      tribe,
    });
  } catch (error) {
    console.error('Synergy suggestions error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch synergy suggestions' },
      { status: 500 }
    );
  }
}
