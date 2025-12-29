'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { DeckList } from '@/components/deck/DeckList';
import { DeckStats } from '@/components/deck/DeckStats';
import { CardPreview } from '@/components/card/CardPreview';
import { CardImage } from '@/components/card/CardImage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDeckStore } from '@/stores/deckStore';
import { calculateDeckStats } from '@/types';

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
  const { setSelectedCard } = useDeckStore();

  // Don't include commanders in allCards - they're shown separately
  const allCards = [...deck.mainboard];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 container py-6 lg:pr-[380px]">
        {/* Deck Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{deck.name}</h1>
          <p className="text-sm text-muted-foreground">
            {deck.format.charAt(0).toUpperCase() + deck.format.slice(1)}
            {deck.commanders.length > 0 &&
              ` - ${deck.commanders.map((c) => c.name).join(' & ')}`}
          </p>
        </div>

        {/* Commander Section */}
        {deck.commanders.length > 0 && (
          <Card className="mb-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-4 text-center">
                {deck.commanders.length === 1 ? 'Commander' : 'Commanders'}
              </h2>
              <div className={`flex justify-center gap-6 ${deck.commanders.length > 1 ? 'flex-wrap' : ''}`}>
                {deck.commanders.map((commander) => (
                  <div
                    key={commander.id}
                    className="flex flex-col items-center cursor-pointer group"
                    onClick={() => setSelectedCard(selectedCard?.id === commander.id ? null : commander)}
                  >
                    <div className={`transition-all ${selectedCard?.id === commander.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg' : 'group-hover:scale-105'}`}>
                      <CardImage card={commander} size="large" priority />
                    </div>
                    <p className="mt-2 font-medium text-center max-w-[200px]">{commander.name}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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

      {/* Fixed Card Preview Panel */}
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
