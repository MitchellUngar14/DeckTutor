'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ChatContainer, AuthGate } from '@/components/chat';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeckStore } from '@/stores/deckStore';
import { detectSynergies } from '@/lib/synergy-detector';
import { calculateDeckStats } from '@/types';
import type { DeckContext, DeckCombo, PotentialCombo } from '@/types';

export default function DeckChatPage() {
  const params = useParams();
  const deckId = params.id as string;
  const { currentDeck } = useDeckStore();

  const [combos, setCombos] = useState<DeckCombo[]>([]);
  const [potentialCombos, setPotentialCombos] = useState<PotentialCombo[]>([]);
  const [isLoadingCombos, setIsLoadingCombos] = useState(true);

  // Detect synergies
  const synergies = useMemo(() => {
    if (!currentDeck) return [];

    const allCards = [
      ...currentDeck.commanders,
      ...currentDeck.mainboard.map((dc) => dc.card),
    ];
    const commander = currentDeck.commanders[0];

    return detectSynergies(allCards, commander);
  }, [currentDeck]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!currentDeck) return null;
    return calculateDeckStats(currentDeck);
  }, [currentDeck]);

  // Fetch combos
  useEffect(() => {
    async function checkCombos() {
      if (!currentDeck) return;

      setIsLoadingCombos(true);
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

        if (response.ok) {
          const data = await response.json();
          setCombos(data.combos || []);
          setPotentialCombos(data.potentialCombos || []);
        }
      } catch (err) {
        console.error('Combo check error:', err);
      } finally {
        setIsLoadingCombos(false);
      }
    }

    checkCombos();
  }, [currentDeck]);

  // Build deck context for the AI
  const deckContext: DeckContext | null = useMemo(() => {
    if (!currentDeck || !stats) return null;

    // Get commander's color identity
    const colorIdentity = currentDeck.commanders[0]?.colorIdentity || [];

    return {
      deckId: currentDeck.id,
      deckName: currentDeck.name,
      commanders: currentDeck.commanders.map((c) => c.name),
      mainboardCards: currentDeck.mainboard.map((dc) => dc.card.name),
      sideboardCards: currentDeck.sideboard.map((dc) => dc.card.name),
      stats,
      synergies,
      combos,
      potentialCombos,
      colorIdentity,
      format: currentDeck.format,
    };
  }, [currentDeck, stats, synergies, combos, potentialCombos]);

  if (!currentDeck) {
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

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 flex flex-col container mx-auto max-w-4xl">
        <div className="flex-1 flex flex-col border-x bg-background">
          {/* Header */}
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">AI Deck Advisor</h1>
              <p className="text-sm text-muted-foreground">
                Discussing {currentDeck.name}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/deck/${deckId}`}>Back to Deck</Link>
            </Button>
          </div>

          {/* Loading indicator for combos */}
          {isLoadingCombos && (
            <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-2 text-sm text-muted-foreground">
              <Skeleton className="h-4 w-4 rounded-full" />
              Loading combos data...
            </div>
          )}

          {/* Chat container */}
          <div className="flex-1 flex flex-col min-h-0">
            <AuthGate>
              <ChatContainer
                deckContext={deckContext}
                deckId={deckId}
              />
            </AuthGate>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
