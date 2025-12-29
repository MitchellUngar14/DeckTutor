'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeckStore } from '@/stores/deckStore';
import type { DeckCombo, PotentialCombo } from '@/types';

export default function CombosPage() {
  const { currentDeck } = useDeckStore();
  const [combos, setCombos] = useState<DeckCombo[]>([]);
  const [potentialCombos, setPotentialCombos] = useState<PotentialCombo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setError('Failed to connect to combo service. Make sure the Python service is running.');
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
        <main className="flex-1 container py-12">
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

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 container py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Combo Analysis</h1>
            <p className="text-sm text-muted-foreground">
              Combos detected in {currentDeck.name}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/deck/${currentDeck.id}`}>Back to Deck</Link>
          </Button>
        </div>

        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
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
                The combo detection service uses a Python backend. Make sure it&apos;s
                running at the configured URL.
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

        {!isLoading && !error && combos.length === 0 && potentialCombos.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No combos detected</CardTitle>
              <CardDescription>
                We couldn&apos;t find any known combos in your deck. This doesn&apos;t
                mean there aren&apos;t synergies - just that we don&apos;t have data
                for them yet.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {!isLoading && !error && combos.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">
              Complete Combos ({combos.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {combos.map((deckCombo, i) => (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {deckCombo.combo.name || 'Combo'}
                    </CardTitle>
                    <CardDescription>{deckCombo.combo.result}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Cards:</p>
                      <div className="flex flex-wrap gap-1">
                        {deckCombo.combo.cards.map((card) => (
                          <Badge key={card} variant="secondary">
                            {card}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {deckCombo.combo.steps.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">How it works:</p>
                        <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                          {deckCombo.combo.steps.map((step, j) => (
                            <li key={j}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {!isLoading && !error && potentialCombos.length > 0 && (
          <div className="space-y-6 mt-8">
            <h2 className="text-xl font-semibold">
              Potential Combos ({potentialCombos.length})
            </h2>
            <p className="text-muted-foreground">
              Add these cards to complete powerful combos:
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {potentialCombos.map((potential, i) => (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle className="text-lg">{potential.description}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">You have:</p>
                      <div className="flex flex-wrap gap-1">
                        {potential.cards.map((card) => (
                          <Badge key={card} variant="outline">
                            {card}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Missing pieces:</p>
                      <div className="flex flex-wrap gap-1">
                        {potential.missingPieces.map((card) => (
                          <Badge key={card} variant="destructive">
                            {card}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
