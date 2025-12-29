'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Sparkles, Zap, Target, X, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ManaText } from '@/components/ui/mana-symbol';
import { CardPreview } from '@/components/card/CardPreview';
import { useDeckStore } from '@/stores/deckStore';
import { detectSynergies } from '@/lib/synergy-detector';
import type { Card as CardType, DeckCombo, PotentialCombo, Synergy } from '@/types';

// Scryfall API for fetching cards not in deck
const SCRYFALL_API = 'https://api.scryfall.com';

interface ScryfallCard {
  id: string;
  oracle_id: string;
  name: string;
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  colors?: string[];
  color_identity: string[];
  keywords?: string[];
  power?: string;
  toughness?: string;
  loyalty?: string;
  rarity: string;
  set: string;
  set_name: string;
  collector_number: string;
  layout: string;
  edhrec_rank?: number;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    art_crop: string;
  };
  card_faces?: Array<{
    name: string;
    mana_cost?: string;
    type_line?: string;
    oracle_text?: string;
    power?: string;
    toughness?: string;
    image_uris?: {
      small: string;
      normal: string;
      large: string;
      art_crop: string;
    };
  }>;
  prices: {
    usd?: string;
    usd_foil?: string;
    eur?: string;
  };
  legalities: Record<string, string>;
  scryfall_uri: string;
}

function mapScryfallToCard(data: ScryfallCard): CardType {
  const imageUris = data.image_uris || data.card_faces?.[0]?.image_uris;

  // Default placeholder image URIs if none available
  const defaultImageUris = {
    small: 'https://cards.scryfall.io/small/front/0/0/00000000-0000-0000-0000-000000000000.jpg',
    normal: 'https://cards.scryfall.io/normal/front/0/0/00000000-0000-0000-0000-000000000000.jpg',
    large: 'https://cards.scryfall.io/large/front/0/0/00000000-0000-0000-0000-000000000000.jpg',
    artCrop: 'https://cards.scryfall.io/art_crop/front/0/0/00000000-0000-0000-0000-000000000000.jpg',
  };

  return {
    id: data.id,
    oracleId: data.oracle_id,
    name: data.name,
    manaCost: data.mana_cost || data.card_faces?.[0]?.mana_cost || '',
    cmc: data.cmc,
    typeLine: data.type_line,
    oracleText: data.oracle_text || data.card_faces?.map(f => f.oracle_text).filter(Boolean).join('\n\n') || '',
    colors: data.colors || [],
    colorIdentity: data.color_identity || [],
    keywords: data.keywords || [],
    legalities: data.legalities,
    imageUris: imageUris ? {
      small: imageUris.small,
      normal: imageUris.normal,
      large: imageUris.large,
      artCrop: imageUris.art_crop,
    } : defaultImageUris,
    cardFaces: data.card_faces?.map(face => ({
      name: face.name,
      manaCost: face.mana_cost,
      typeLine: face.type_line || '',
      oracleText: face.oracle_text,
      imageUris: face.image_uris ? {
        small: face.image_uris.small,
        normal: face.image_uris.normal,
        large: face.image_uris.large,
        artCrop: face.image_uris.art_crop,
      } : undefined,
    })),
    prices: {
      usd: data.prices.usd,
      eur: data.prices.eur,
    },
    rarity: data.rarity,
    setCode: data.set,
    setName: data.set_name,
    collectorNumber: data.collector_number,
    scryfallUri: data.scryfall_uri,
    edhrecRank: data.edhrec_rank,
    layout: data.layout,
  };
}

const SYNERGY_TYPE_LABELS: Record<string, string> = {
  tribal: 'Tribal',
  keyword: 'Keyword',
  sacrifice: 'Sacrifice',
  tokens: 'Tokens',
  counters: 'Counters',
  graveyard: 'Graveyard',
  artifacts: 'Artifacts',
  enchantments: 'Enchantments',
  lands: 'Lands',
  spellslinger: 'Spellslinger',
  voltron: 'Voltron',
  ramp: 'Ramp',
  draw: 'Card Draw',
  commander: 'Commander',
};

const STRENGTH_COLORS = {
  strong: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
  moderate: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  minor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
};

export default function CombosPage() {
  const { currentDeck } = useDeckStore();
  const [combos, setCombos] = useState<DeckCombo[]>([]);
  const [potentialCombos, setPotentialCombos] = useState<PotentialCombo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [loadingCardName, setLoadingCardName] = useState<string | null>(null);
  const [externalCardCache, setExternalCardCache] = useState<Map<string, CardType>>(new Map());
  const [synergySuggestions, setSynergySuggestions] = useState<Map<string, string[]>>(new Map());
  const [loadingSynergyId, setLoadingSynergyId] = useState<string | null>(null);

  // Build a map of card names to card objects for quick lookup
  const cardMap = useMemo(() => {
    if (!currentDeck) return new Map<string, CardType>();

    const map = new Map<string, CardType>();
    for (const commander of currentDeck.commanders) {
      map.set(commander.name.toLowerCase(), commander);
    }
    for (const dc of currentDeck.mainboard) {
      map.set(dc.card.name.toLowerCase(), dc.card);
    }
    for (const dc of currentDeck.sideboard) {
      map.set(dc.card.name.toLowerCase(), dc.card);
    }
    return map;
  }, [currentDeck]);

  // Find card by name
  const findCard = (name: string): CardType | undefined => {
    return cardMap.get(name.toLowerCase());
  };

  // Handle clicking a card badge
  const handleCardClick = (cardName: string) => {
    const card = findCard(cardName);
    if (card) {
      setSelectedCard(card);
    }
  };

  // Fetch an external card (not in deck) from Scryfall
  const fetchExternalCard = useCallback(async (cardName: string) => {
    // Check cache first
    const cached = externalCardCache.get(cardName.toLowerCase());
    if (cached) {
      setSelectedCard(cached);
      return;
    }

    setLoadingCardName(cardName);
    try {
      const response = await fetch(
        `${SCRYFALL_API}/cards/named?fuzzy=${encodeURIComponent(cardName)}`,
        { headers: { Accept: 'application/json' } }
      );

      if (!response.ok) {
        console.error(`Failed to fetch card: ${cardName}`);
        return;
      }

      const data: ScryfallCard = await response.json();
      const card = mapScryfallToCard(data);

      // Add to cache
      setExternalCardCache((prev) => {
        const newCache = new Map(prev);
        newCache.set(cardName.toLowerCase(), card);
        return newCache;
      });

      setSelectedCard(card);
    } catch (err) {
      console.error(`Error fetching card ${cardName}:`, err);
    } finally {
      setLoadingCardName(null);
    }
  }, [externalCardCache]);

  // Fetch synergy suggestions from Scryfall via our API
  const fetchSynergySuggestions = useCallback(async (synergyId: string, synergyType: string, tribe?: string, keyword?: string) => {
    // Check cache first
    if (synergySuggestions.has(synergyId)) return;

    if (!currentDeck) return;

    setLoadingSynergyId(synergyId);
    try {
      // Get all card names in the deck
      const deckCards = [
        ...currentDeck.commanders.map(c => c.name),
        ...currentDeck.mainboard.map(dc => dc.card.name),
        ...currentDeck.sideboard.map(dc => dc.card.name),
      ];

      // Get commander's color identity for filtering suggestions
      const colorIdentity = currentDeck.commanders[0]?.colorIdentity || [];

      const response = await fetch('/api/synergies/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          synergyType,
          tribe,
          keyword,
          deckCards,
          colorIdentity,
        }),
      });

      if (!response.ok) {
        console.error('Failed to fetch synergy suggestions');
        return;
      }

      const data = await response.json();

      setSynergySuggestions((prev) => {
        const newMap = new Map(prev);
        newMap.set(synergyId, data.suggestions || []);
        return newMap;
      });
    } catch (err) {
      console.error('Error fetching synergy suggestions:', err);
    } finally {
      setLoadingSynergyId(null);
    }
  }, [currentDeck, synergySuggestions]);

  // Detect synergies client-side using the full card data
  const synergies = useMemo(() => {
    if (!currentDeck) return [];

    const allCards = [
      ...currentDeck.commanders,
      ...currentDeck.mainboard.map((dc) => dc.card),
    ];
    const commander = currentDeck.commanders[0];

    return detectSynergies(allCards, commander);
  }, [currentDeck]);

  useEffect(() => {
    async function checkCombos() {
      if (!currentDeck) return;

      setIsLoading(true);
      setError(null);

      try {
        const allCards = [
          ...currentDeck.commanders.map((c) => c.name),
          ...currentDeck.mainboard.map((dc) => dc.card.name),
        ];

        const response = await fetch('/api/combos/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cards: allCards,
            commander: currentDeck.commanders[0]?.name,
          }),
        });

        if (!response.ok) {
          if (response.status === 503) {
            setError(
              'Combo detection service is currently unavailable. Please try again later.'
            );
          } else {
            setError('Failed to check combos. Please try again.');
          }
          return;
        }

        const data = await response.json();
        setCombos(data.combos || []);
        setPotentialCombos(data.potentialCombos || []);
      } catch (err) {
        console.error('Combo check error:', err);
        setError('Failed to connect to Commander Spellbook. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    checkCombos();
  }, [currentDeck]);

  if (!currentDeck) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">No deck loaded</h1>
            <p className="text-muted-foreground">
              Import a deck first to check for combos.
            </p>
            <Button asChild>
              <Link href="/deck/import">Import a Deck</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const totalFindings = combos.length + potentialCombos.length + synergies.length;

  // Clickable card badge component
  const CardBadge = ({
    name,
    variant = 'secondary',
    className = '',
  }: {
    name: string;
    variant?: 'secondary' | 'outline' | 'destructive';
    className?: string;
  }) => {
    const card = findCard(name);
    const isInDeck = !!card;
    const isSelected = selectedCard?.name.toLowerCase() === name.toLowerCase();

    return (
      <Badge
        variant={variant}
        className={`cursor-pointer transition-all hover:scale-105 ${
          isSelected ? 'ring-2 ring-primary ring-offset-1' : ''
        } ${!isInDeck ? 'opacity-60' : ''} ${className}`}
        onClick={() => isInDeck && handleCardClick(name)}
        title={isInDeck ? 'Click to preview' : 'Card not in deck'}
      >
        {name}
      </Badge>
    );
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-6 lg:pr-[380px]">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Deck Analysis</h1>
            <p className="text-sm text-muted-foreground">
              Combos and synergies in {currentDeck.name}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/deck/${currentDeck.id}`}>Back to Deck</Link>
          </Button>
        </div>

        <Tabs defaultValue="synergies" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="synergies" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Synergies ({synergies.length})
            </TabsTrigger>
            <TabsTrigger value="combos" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Combos {isLoading ? '(...)' : `(${combos.length})`}
            </TabsTrigger>
            <TabsTrigger value="potential" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Potential {isLoading ? '(...)' : `(${potentialCombos.length})`}
            </TabsTrigger>
          </TabsList>

          {/* Synergies Tab */}
          <TabsContent value="synergies" className="space-y-6">
            {synergies.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No major synergies detected</CardTitle>
                  <CardDescription>
                    Your deck may have synergies we haven&apos;t detected yet, or it
                    may be focused on a strategy we don&apos;t recognize.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {synergies.map((synergy) => {
                  const suggestions = synergySuggestions.get(synergy.id) || [];
                  const isLoadingSuggestions = loadingSynergyId === synergy.id;
                  // Extract tribe from synergy id if it's a tribal synergy (e.g., "synergy-tribal-zombie" -> "Zombie")
                  const tribe = synergy.id.startsWith('synergy-tribal-')
                    ? synergy.id.replace('synergy-tribal-', '').charAt(0).toUpperCase() +
                      synergy.id.replace('synergy-tribal-', '').slice(1)
                    : undefined;
                  // Extract keyword from synergy id if it's a keyword synergy (e.g., "synergy-keyword-flying" -> "flying")
                  const keyword = synergy.id.startsWith('synergy-keyword-')
                    ? synergy.id.replace('synergy-keyword-', '').replace('-', ' ')
                    : undefined;

                  return (
                    <Card key={synergy.id} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">
                            {SYNERGY_TYPE_LABELS[synergy.type] || synergy.type}
                          </Badge>
                          <Badge className={STRENGTH_COLORS[synergy.strength]}>
                            {synergy.strength}
                          </Badge>
                        </div>
                        <CardDescription className="mt-2">
                          {synergy.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-sm font-medium mb-2">In your deck:</p>
                          <div className="flex flex-wrap gap-1">
                            {synergy.cards.map((card) => (
                              <CardBadge key={card} name={card} variant="secondary" className="text-xs" />
                            ))}
                          </div>
                        </div>

                        {/* Suggestions section */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-sm font-medium">Consider adding:</p>
                            {suggestions.length === 0 && !isLoadingSuggestions && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => fetchSynergySuggestions(synergy.id, synergy.type, tribe, keyword)}
                              >
                                Load suggestions
                              </Button>
                            )}
                          </div>
                          {isLoadingSuggestions ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Finding popular cards...
                            </div>
                          ) : suggestions.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {suggestions.map((cardName) => {
                                const isLoading = loadingCardName === cardName;
                                const isSelected = selectedCard?.name.toLowerCase() === cardName.toLowerCase();
                                return (
                                  <Badge
                                    key={cardName}
                                    variant="destructive"
                                    className={`cursor-pointer transition-all hover:scale-105 text-xs ${
                                      isSelected ? 'ring-2 ring-primary ring-offset-1' : ''
                                    }`}
                                    onClick={() => fetchExternalCard(cardName)}
                                    title="Click to preview"
                                  >
                                    {isLoading ? (
                                      <span className="flex items-center gap-1">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        {cardName}
                                      </span>
                                    ) : (
                                      cardName
                                    )}
                                  </Badge>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Combos Tab */}
          <TabsContent value="combos" className="space-y-6">
            {isLoading && (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            )}

            {error && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">Error</CardTitle>
                  <CardDescription>{error}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Combo data is provided by Commander Spellbook. The service may be
                    temporarily unavailable.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                  >
                    Retry
                  </Button>
                </CardContent>
              </Card>
            )}

            {!isLoading && !error && combos.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>No complete combos detected</CardTitle>
                  <CardDescription>
                    Your deck doesn&apos;t contain any known infinite combos from
                    Commander Spellbook. Check the Potential tab for combos you&apos;re
                    close to completing.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {!isLoading && !error && combos.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {combos.map((deckCombo, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {deckCombo.combo.name || 'Combo'}
                      </CardTitle>
                      <CardDescription>
                        <ManaText text={deckCombo.combo.result} />
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Cards:</p>
                        <div className="flex flex-wrap gap-1">
                          {deckCombo.combo.cards.map((card) => (
                            <CardBadge key={card} name={card} variant="secondary" />
                          ))}
                        </div>
                      </div>
                      {deckCombo.combo.steps.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">How it works:</p>
                          <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                            {deckCombo.combo.steps.map((step, j) => (
                              <li key={j}><ManaText text={step} /></li>
                            ))}
                          </ol>
                        </div>
                      )}
                      {deckCombo.combo.sourceUrl && (
                        <a
                          href={deckCombo.combo.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          View on Commander Spellbook →
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Potential Combos Tab */}
          <TabsContent value="potential" className="space-y-6">
            {isLoading && (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            )}

            {!isLoading && !error && potentialCombos.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>No potential combos found</CardTitle>
                  <CardDescription>
                    We couldn&apos;t find any combos that you&apos;re close to
                    completing. Your deck may be focused on other strategies.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {!isLoading && !error && potentialCombos.length > 0 && (
              <>
                <p className="text-muted-foreground">
                  Add these cards to complete powerful combos:
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {potentialCombos.map((potential, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          <ManaText text={potential.description} />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-sm font-medium mb-2">You have:</p>
                          <div className="flex flex-wrap gap-1">
                            {potential.cards.map((card) => (
                              <CardBadge key={card} name={card} variant="outline" />
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">Missing pieces:</p>
                          <div className="flex flex-wrap gap-1">
                            {potential.missingPieces.map((cardName) => {
                              const isLoading = loadingCardName === cardName;
                              const isSelected = selectedCard?.name.toLowerCase() === cardName.toLowerCase();
                              return (
                                <Badge
                                  key={cardName}
                                  variant="destructive"
                                  className={`cursor-pointer transition-all hover:scale-105 ${
                                    isSelected ? 'ring-2 ring-primary ring-offset-1' : ''
                                  }`}
                                  onClick={() => fetchExternalCard(cardName)}
                                  title="Click to preview"
                                >
                                  {isLoading ? (
                                    <span className="flex items-center gap-1">
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      {cardName}
                                    </span>
                                  ) : (
                                    cardName
                                  )}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                        {potential.sourceUrl && (
                          <a
                            href={potential.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:underline"
                          >
                            View on Commander Spellbook →
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Mobile Card Preview Modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedCard(null)}
          />
          {/* Content */}
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 max-h-[85vh] overflow-y-auto bg-background rounded-lg border shadow-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Card Preview</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedCard(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardPreview card={selectedCard} />
          </div>
        </div>
      )}

      {/* Desktop Fixed Card Preview Panel */}
      <div
        className={`fixed right-0 top-16 bottom-0 w-[360px] border-l bg-background transition-transform duration-300 hidden lg:block ${
          selectedCard ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Card Preview</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedCard(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardPreview card={selectedCard} />
        </div>
      </div>

      <Footer />
    </div>
  );
}
