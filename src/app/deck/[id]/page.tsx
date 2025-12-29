'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { DeckList } from '@/components/deck/DeckList';
import { DeckStats } from '@/components/deck/DeckStats';
import { CardPreview } from '@/components/card/CardPreview';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useDeckStore, type ViewMode, type SortBy, type GroupBy } from '@/stores/deckStore';
import { calculateDeckStats } from '@/types';

export default function DeckPage() {
  const params = useParams();
  const { currentDeck, hoveredCard, viewMode, setViewMode, sortBy, setSortBy, groupBy, setGroupBy } =
    useDeckStore();
  const [showSettings, setShowSettings] = useState(false);

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
        <main className="flex-1 container py-12">
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
  const allCards = [
    ...deck.commanders.map((card) => ({
      card,
      quantity: 1,
      board: 'commanders' as const,
    })),
    ...deck.mainboard,
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 container py-6">
        {/* Deck Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{deck.name}</h1>
            <p className="text-sm text-muted-foreground">
              {deck.format.charAt(0).toUpperCase() + deck.format.slice(1)}
              {deck.commanders.length > 0 &&
                ` - ${deck.commanders.map((c) => c.name).join(' & ')}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/deck/${deck.id}/combos`}>Check Combos</Link>
            </Button>
            {deck.moxfieldUrl && (
              <Button variant="outline" asChild>
                <a href={deck.moxfieldUrl} target="_blank" rel="noopener noreferrer">
                  View on Moxfield
                </a>
              </Button>
            )}
            <Sheet open={showSettings} onOpenChange={setShowSettings}>
              <SheetTrigger asChild>
                <Button variant="outline">Settings</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>View Settings</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">View Mode</label>
                    <div className="flex gap-2">
                      {(['grid', 'list', 'visual'] as ViewMode[]).map((mode) => (
                        <Button
                          key={mode}
                          variant={viewMode === mode ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setViewMode(mode)}
                        >
                          {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sort By</label>
                    <div className="flex flex-wrap gap-2">
                      {(['name', 'cmc', 'type', 'color'] as SortBy[]).map((sort) => (
                        <Button
                          key={sort}
                          variant={sortBy === sort ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSortBy(sort)}
                        >
                          {sort.toUpperCase()}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Group By</label>
                    <div className="flex flex-wrap gap-2">
                      {(['type', 'cmc', 'color', 'none'] as GroupBy[]).map((group) => (
                        <Button
                          key={group}
                          variant={groupBy === group ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setGroupBy(group)}
                        >
                          {group === 'none' ? 'None' : group.toUpperCase()}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6">
          <DeckStats stats={stats} />
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

          <div className="grid gap-6 lg:grid-cols-[1fr,350px]">
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

            <div className="hidden lg:block">
              <div className="sticky top-20 rounded-lg border p-4">
                <h3 className="mb-4 font-semibold">Card Preview</h3>
                <CardPreview card={hoveredCard} />
              </div>
            </div>
          </div>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
