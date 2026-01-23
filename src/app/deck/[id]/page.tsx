'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { DeckList } from '@/components/deck/DeckList';
import { AddCardSearch } from '@/components/deck/AddCardSearch';
import { DeckStatsSummary, ManaCurve } from '@/components/deck/DeckStats';
import { CardPreview } from '@/components/card/CardPreview';
import { CardImage } from '@/components/card/CardImage';
import { ExportDeckModal } from '@/components/deck/ExportDeckModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, RefreshCw, Pencil, Check, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDeckStore } from '@/stores/deckStore';
import { useAuth } from '@/context/AuthContext';
import { calculateDeckStats, type Deck, type Card as CardType, type DeckCard } from '@/types';

function isLand(card: CardType): boolean {
  return card.typeLine.toLowerCase().includes('land');
}

function calculateDeckValue(deck: Deck, excludeLands: boolean = false): number {
  let total = 0;

  // Commanders
  for (const commander of deck.commanders) {
    if (excludeLands && isLand(commander)) continue;
    const price = parseFloat(commander.prices?.usd || '0');
    if (!isNaN(price)) total += price;
  }

  // Mainboard
  for (const dc of deck.mainboard) {
    if (excludeLands && isLand(dc.card)) continue;
    const price = parseFloat(dc.card.prices?.usd || '0');
    if (!isNaN(price)) total += price * dc.quantity;
  }

  // Sideboard
  for (const dc of deck.sideboard) {
    if (excludeLands && isLand(dc.card)) continue;
    const price = parseFloat(dc.card.prices?.usd || '0');
    if (!isNaN(price)) total += price * dc.quantity;
  }

  return total;
}

export default function DeckPage() {
  const params = useParams();
  const deckId = params.id as string;
  const {
    currentDeck,
    selectedCard,
    setCurrentDeck,
    setSelectedCard,
    setSavedDeckSnapshot,
    setSavedDeckId,
  } = useDeckStore();
  const { user, loading: authLoading } = useAuth();
  const [loadedDeck, setLoadedDeck] = useState<Deck | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchAttempted, setFetchAttempted] = useState(false);
  const [showCheapest, setShowCheapest] = useState(false);
  const [excludeLands, setExcludeLands] = useState(false);
  const [cheapestValue, setCheapestValue] = useState<number | null>(null);
  const [cheapestValueNoLands, setCheapestValueNoLands] = useState<number | null>(null);
  const [isLoadingCheapest, setIsLoadingCheapest] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Use the store deck if its ID matches, otherwise use loaded deck
  const deck = currentDeck?.id === deckId ? currentDeck : loadedDeck;

  const fetchDeck = useCallback(async () => {
    if (!deckId || fetchAttempted) return;

    setIsLoading(true);
    setFetchAttempted(true);

    try {
      // If user is logged in, try to fetch as owner first
      if (user) {
        const token = localStorage.getItem('decktutor-token');
        const response = await fetch(`/api/user/decks/${deckId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const savedDeck = data.deck;

          if (savedDeck.deckData) {
            const transformedDeck: Deck = {
              id: savedDeck.id,
              name: savedDeck.name,
              description: savedDeck.description || undefined,
              format: savedDeck.format || 'commander',
              moxfieldId: savedDeck.moxfieldId || undefined,
              moxfieldUrl: savedDeck.deckData.moxfieldUrl || (savedDeck.moxfieldId ? `https://www.moxfield.com/decks/${savedDeck.moxfieldId}` : undefined),
              importedAt: savedDeck.createdAt,
              lastModifiedAt: savedDeck.lastModifiedAt,
              commanders: savedDeck.deckData.commanders || [],
              mainboard: savedDeck.deckData.mainboard || [],
              sideboard: savedDeck.deckData.sideboard || [],
              maybeboard: savedDeck.deckData.maybeboard || [],
            };

            setLoadedDeck(transformedDeck);
            setCurrentDeck(transformedDeck);
            setSavedDeckSnapshot(JSON.parse(JSON.stringify(transformedDeck)));
            setSavedDeckId(savedDeck.id);
            setIsReadOnly(false);
            return;
          }
        }
      }

      // Fall back to public endpoint (for guests or if user doesn't own the deck)
      const publicResponse = await fetch(`/api/decks/${deckId}`);

      if (publicResponse.ok) {
        const data = await publicResponse.json();
        const sharedDeck = data.deck;

        if (sharedDeck.deckData) {
          const transformedDeck: Deck = {
            id: sharedDeck.id,
            name: sharedDeck.name,
            description: sharedDeck.description || undefined,
            format: sharedDeck.format || 'commander',
            moxfieldId: sharedDeck.moxfieldId || undefined,
            moxfieldUrl: sharedDeck.deckData.moxfieldUrl || (sharedDeck.moxfieldId ? `https://www.moxfield.com/decks/${sharedDeck.moxfieldId}` : undefined),
            importedAt: sharedDeck.createdAt,
            lastModifiedAt: sharedDeck.lastModifiedAt,
            commanders: sharedDeck.deckData.commanders || [],
            mainboard: sharedDeck.deckData.mainboard || [],
            sideboard: sharedDeck.deckData.sideboard || [],
            maybeboard: sharedDeck.deckData.maybeboard || [],
          };

          setLoadedDeck(transformedDeck);
          setCurrentDeck(transformedDeck);
          setIsReadOnly(true);
        }
      }
    } catch (error) {
      console.error('Error fetching deck:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, deckId, fetchAttempted, setCurrentDeck, setSavedDeckSnapshot, setSavedDeckId]);

  useEffect(() => {
    // Wait for auth to finish loading before fetching
    // This ensures we know if user is logged in before deciding which endpoint to use
    if (authLoading) return;

    // If we don't have a matching deck in the store, try to fetch from API
    if (!deck && !fetchAttempted) {
      fetchDeck();
    }
  }, [deck, fetchAttempted, fetchDeck, authLoading]);

  if (isLoading || authLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12">
          <div className="text-center text-muted-foreground">Loading deck...</div>
        </main>
        <Footer />
      </div>
    );
  }

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
  const deckValue = calculateDeckValue(deck, excludeLands);

  const fetchCheapestValue = async (excludeLandsParam: boolean) => {
    const cacheKey = excludeLandsParam ? cheapestValueNoLands : cheapestValue;
    if (cacheKey !== null) return; // Already fetched

    setIsLoadingCheapest(true);
    try {
      const allCards = [
        ...deck.commanders.map((c) => ({ card: c, quantity: 1 })),
        ...deck.mainboard.map((dc) => ({ card: dc.card, quantity: dc.quantity })),
        ...deck.sideboard.map((dc) => ({ card: dc.card, quantity: dc.quantity })),
      ];

      // Filter out lands if requested
      const filteredCards = excludeLandsParam
        ? allCards.filter(({ card }) => !isLand(card))
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
        if (excludeLandsParam) {
          setCheapestValueNoLands(data.cheapestValue);
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
      const cached = excludeLands ? cheapestValueNoLands : cheapestValue;
      if (cached === null) {
        fetchCheapestValue(excludeLands);
      }
    }
  };

  const handleToggleExcludeLands = () => {
    const newValue = !excludeLands;
    setExcludeLands(newValue);
    // If showing cheapest, fetch the new value if not cached
    if (showCheapest) {
      const cached = newValue ? cheapestValueNoLands : cheapestValue;
      if (cached === null) {
        fetchCheapestValue(newValue);
      }
    }
  };

  const currentCheapestValue = excludeLands ? cheapestValueNoLands : cheapestValue;

  const handleStartEditName = () => {
    setEditedName(deck.name);
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    const trimmedName = editedName.trim();
    if (trimmedName && trimmedName !== deck.name) {
      setCurrentDeck({
        ...deck,
        name: trimmedName,
        lastModifiedAt: new Date().toISOString(),
      });
    }
    setIsEditingName(false);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelEditName();
    }
  };

  // Don't include commanders in allCards - they're shown separately
  const allCards = [...deck.mainboard];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-6 lg:pr-[380px]">
        {/* Shared Deck Banner */}
        {isReadOnly && (
          <div className="mb-4 rounded-lg border bg-muted/50 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              You&apos;re viewing a shared deck.{' '}
              {!user && (
                <Link href="/auth/signin" className="text-primary hover:underline">
                  Sign in
                </Link>
              )}{' '}
              {!user && 'to save and edit your own decks.'}
            </p>
          </div>
        )}

        {/* Deck Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            {isEditingName && !isReadOnly ? (
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={handleNameKeyDown}
                  onBlur={handleSaveName}
                  className="text-2xl font-bold h-auto py-1"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSaveName}
                  className="h-8 w-8"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold">{deck.name}</h1>
                {!isReadOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleStartEditName}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExportModal(true)}
                  className="ml-2"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </>
            )}
          </div>
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
              {excludeLands && ' (excl. lands)'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showCheapest ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleToggleCheapest(!showCheapest)}
              disabled={isLoadingCheapest}
            >
              {showCheapest ? 'Show current' : 'Show cheapest'}
            </Button>
            <Button
              variant={excludeLands ? 'default' : 'outline'}
              size="sm"
              onClick={handleToggleExcludeLands}
              disabled={isLoadingCheapest}
            >
              {excludeLands ? 'Include lands' : 'Exclude lands'}
            </Button>
          </div>
          {showCheapest && currentCheapestValue !== null && deckValue > currentCheapestValue && (
            <span className="text-sm text-muted-foreground">
              (save ${(deckValue - currentCheapestValue).toFixed(2)})
            </span>
          )}
        </div>

        {/* Add Card Search - only for owners */}
        {!isReadOnly && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Add Cards</h2>
            <AddCardSearch className="max-w-md" />
          </div>
        )}

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

      {/* Export Deck Modal */}
      <ExportDeckModal
        open={showExportModal}
        onOpenChange={setShowExportModal}
        deck={deck}
      />

      <Footer />
    </div>
  );
}
