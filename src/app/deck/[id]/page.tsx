'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { DeckList } from '@/components/deck/DeckList';
import { DeckStatsSummary, ManaCurve } from '@/components/deck/DeckStats';
import { CardPreview } from '@/components/card/CardPreview';
import { CardImage } from '@/components/card/CardImage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, RefreshCw } from 'lucide-react';
import { useDeckStore } from '@/stores/deckStore';
import { calculateDeckStats, type Deck, type Card as CardType } from '@/types';

const BASIC_LAND_NAMES = [
  'Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes',
  'Snow-Covered Plains', 'Snow-Covered Island', 'Snow-Covered Swamp',
  'Snow-Covered Mountain', 'Snow-Covered Forest',
];

function isBasicLand(card: CardType): boolean {
  return BASIC_LAND_NAMES.includes(card.name) ||
         card.typeLine.toLowerCase().includes('basic land');
}

function calculateDeckValue(deck: Deck, excludeBasicLands: boolean = false): number {
  let total = 0;

  // Commanders
  for (const commander of deck.commanders) {
    if (excludeBasicLands && isBasicLand(commander)) continue;
    const price = parseFloat(commander.prices?.usd || '0');
    if (!isNaN(price)) total += price;
  }

  // Mainboard
  for (const dc of deck.mainboard) {
    if (excludeBasicLands && isBasicLand(dc.card)) continue;
    const price = parseFloat(dc.card.prices?.usd || '0');
    if (!isNaN(price)) total += price * dc.quantity;
  }

  // Sideboard
  for (const dc of deck.sideboard) {
    if (excludeBasicLands && isBasicLand(dc.card)) continue;
    const price = parseFloat(dc.card.prices?.usd || '0');
    if (!isNaN(price)) total += price * dc.quantity;
  }

  return total;
}

export default function DeckPage() {
  const params = useParams();
  const { currentDeck, selectedCard } = useDeckStore();

  // For now, we just use the deck from the store
  // In a full implementation, we'd fetch the deck by ID from the database
  const deck = currentDeck;

  useEffect(() => {
    // TODO: Fetch deck by ID if not in store
    if (!deck && params.id) {
      console.log('Would fetch deck:', params.id);
    }
  }, [deck, params.id]);

  if (!deck) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Deck not found</h1>
            <p className="text-muted-foreground">
              The deck you&apos;re looking for doesn&apos;t exist or has expired.
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

  const stats = calculateDeckStats(deck);
  const { setSelectedCard } = useDeckStore();

  const [showCheapest, setShowCheapest] = useState(false);
  const [excludeBasicLands, setExcludeBasicLands] = useState(false);
  const [cheapestValue, setCheapestValue] = useState<number | null>(null);
  const [cheapestValueNoBasics, setCheapestValueNoBasics] = useState<number | null>(null);
  const [isLoadingCheapest, setIsLoadingCheapest] = useState(false);

  const deckValue = calculateDeckValue(deck, excludeBasicLands);

  const fetchCheapestValue = async (excludeBasics: boolean) => {
    const cacheKey = excludeBasics ? cheapestValueNoBasics : cheapestValue;
    if (cacheKey !== null) return; // Already fetched

    setIsLoadingCheapest(true);
    try {
      const allCards = [
        ...deck.commanders.map((c) => ({ card: c, quantity: 1 })),
        ...deck.mainboard.map((dc) => ({ card: dc.card, quantity: dc.quantity })),
        ...deck.sideboard.map((dc) => ({ card: dc.card, quantity: dc.quantity })),
      ];

      // Filter out basic lands if requested
      const filteredCards = excludeBasics
        ? allCards.filter(({ card }) => !isBasicLand(card))
        : allCards;

      const cards = filteredCards.map(({ card, quantity }) => ({
        oracleId: card.oracleId,
        name: card.name,
        quantity,
        currentPrice: parseFloat(card.prices?.usd || '0') || 0,
      }));

      const response = await fetch('/api/decks/cheapest-value', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards }),
      });

      if (response.ok) {
        const data = await response.json();
        if (excludeBasics) {
          setCheapestValueNoBasics(data.cheapestValue);
        } else {
          setCheapestValue(data.cheapestValue);
        }
      }
    } catch (error) {
      console.error('Failed to fetch cheapest value:', error);
    } finally {
      setIsLoadingCheapest(false);
    }
  };

  const handleToggleCheapest = (checked: boolean) => {
    setShowCheapest(checked);
    if (checked) {
      const cached = excludeBasicLands ? cheapestValueNoBasics : cheapestValue;
      if (cached === null) {
        fetchCheapestValue(excludeBasicLands);
      }
    }
  };

  const handleToggleExcludeBasics = () => {
    const newValue = !excludeBasicLands;
    setExcludeBasicLands(newValue);
    // If showing cheapest, fetch the new value if not cached
    if (showCheapest) {
      const cached = newValue ? cheapestValueNoBasics : cheapestValue;
      if (cached === null) {
        fetchCheapestValue(newValue);
      }
    }
  };

  const currentCheapestValue = excludeBasicLands ? cheapestValueNoBasics : cheapestValue;

  // Don't include commanders in allCards - they're shown separately
  const allCards = [...deck.mainboard];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-6 lg:pr-[380px]">
        {/* Deck Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{deck.name}</h1>
          <p className="text-sm text-muted-foreground">
            {deck.format.charAt(0).toUpperCase() + deck.format.slice(1)}
            {deck.commanders.length > 0 &&
              ` - ${deck.commanders.map((c) => c.name).join(' & ')}`}
          </p>
        </div>

        {/* Deck Value */}
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-green-600 dark:text-green-400">
              {showCheapest ? (
                isLoadingCheapest ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Calculating...
                  </span>
                ) : currentCheapestValue !== null ? (
                  `$${currentCheapestValue.toFixed(2)}`
                ) : (
                  `$${deckValue.toFixed(2)}`
                )
              ) : (
                `$${deckValue.toFixed(2)}`
              )}
            </span>
            <span className="text-sm text-muted-foreground">
              {showCheapest ? 'cheapest printings' : 'current printings'}
              {excludeBasicLands && ' (excl. basics)'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleCheapest(!showCheapest)}
              disabled={isLoadingCheapest}
            >
              {showCheapest ? 'Show current' : 'Show cheapest'}
            </Button>
            <Button
              variant={excludeBasicLands ? 'default' : 'outline'}
              size="sm"
              onClick={handleToggleExcludeBasics}
              disabled={isLoadingCheapest}
            >
              {excludeBasicLands ? 'Include basics' : 'Exclude basics'}
            </Button>
          </div>
          {showCheapest && currentCheapestValue !== null && deckValue > currentCheapestValue && (
            <span className="text-sm text-muted-foreground">
              (save ${(deckValue - currentCheapestValue).toFixed(2)})
            </span>
          )}
        </div>

        {/* Commander & Stats Section */}
        <div className="mb-6 flex flex-col lg:flex-row gap-6">
          {/* Commander */}
          {deck.commanders.length > 0 && (
            <div className="flex-shrink-0">
              <h2 className="text-sm font-medium text-muted-foreground mb-2">
                {deck.commanders.length === 1 ? 'Commander' : 'Commanders'}
              </h2>
              <div className={`flex gap-4 ${deck.commanders.length > 1 ? 'flex-wrap' : ''}`}>
                {deck.commanders.map((commander) => (
                  <div
                    key={commander.id}
                    className="flex flex-col items-center cursor-pointer group"
                    onClick={() => setSelectedCard(selectedCard?.id === commander.id ? null : commander)}
                  >
                    <div className={`transition-all ${selectedCard?.id === commander.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg' : 'group-hover:scale-105'}`}>
                      <CardImage card={commander} size="large" priority />
                    </div>
                    <p className="mt-2 text-sm font-medium text-center max-w-[200px]">{commander.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats Summary */}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Deck Stats</h2>
            <DeckStatsSummary stats={stats} />
          </div>
        </div>

        {/* Mana Curve */}
        <div className="mb-6">
          <ManaCurve stats={stats} />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="mainboard" className="space-y-4">
          <TabsList>
            <TabsTrigger value="mainboard">
              Mainboard ({deck.mainboard.reduce((s, c) => s + c.quantity, 0)})
            </TabsTrigger>
            {deck.sideboard.length > 0 && (
              <TabsTrigger value="sideboard">
                Sideboard ({deck.sideboard.reduce((s, c) => s + c.quantity, 0)})
              </TabsTrigger>
            )}
            {deck.maybeboard.length > 0 && (
              <TabsTrigger value="maybeboard">
                Maybeboard ({deck.maybeboard.reduce((s, c) => s + c.quantity, 0)})
              </TabsTrigger>
            )}
          </TabsList>

          <div>
            <div className="min-h-[500px] rounded-lg border">
              <TabsContent value="mainboard" className="m-0 h-full">
                <DeckList cards={allCards} className="h-full" />
              </TabsContent>
              <TabsContent value="sideboard" className="m-0 h-full">
                <DeckList cards={deck.sideboard} className="h-full" />
              </TabsContent>
              <TabsContent value="maybeboard" className="m-0 h-full">
                <DeckList cards={deck.maybeboard} className="h-full" />
              </TabsContent>
            </div>
          </div>
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
      <div className="hidden lg:block fixed right-4 top-20 w-[350px] h-[calc(100vh-100px)] rounded-lg border bg-background p-4 shadow-lg overflow-hidden z-40">
        <h3 className="mb-4 font-semibold">Card Preview</h3>
        <div className="h-[calc(100%-2rem)] overflow-y-auto">
          <CardPreview card={selectedCard} />
        </div>
      </div>

      <Footer />
    </div>
  );
}
