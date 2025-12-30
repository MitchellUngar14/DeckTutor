'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeckDiff } from './DeckDiff';
import type { Deck, ParsedDeckSuggestion } from '@/types';

interface DeckComparisonProps {
  originalDeck: Deck;
  suggestedDeck: ParsedDeckSuggestion;
}

export function DeckComparison({ originalDeck, suggestedDeck }: DeckComparisonProps) {
  // Calculate stats for both decks
  const stats = useMemo(() => {
    const originalCount = originalDeck.mainboard.reduce((sum, dc) => sum + dc.quantity, 0);
    const suggestedCount = suggestedDeck.mainboard.reduce((sum, c) => sum + c.quantity, 0);

    const originalCommanders = originalDeck.commanders.length;
    const suggestedCommanders = suggestedDeck.commanders.length;

    return {
      original: {
        mainboard: originalCount,
        commanders: originalCommanders,
        sideboard: originalDeck.sideboard.reduce((sum, dc) => sum + dc.quantity, 0),
      },
      suggested: {
        mainboard: suggestedCount,
        commanders: suggestedCommanders,
        sideboard: suggestedDeck.sideboard.reduce((sum, c) => sum + c.quantity, 0),
      },
    };
  }, [originalDeck, suggestedDeck]);

  return (
    <Tabs defaultValue="diff" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="diff">Differences</TabsTrigger>
        <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
      </TabsList>

      {/* Diff view */}
      <TabsContent value="diff" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Changes Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <DeckDiff
              original={{
                commanders: originalDeck.commanders.map((c) => c.name),
                mainboard: originalDeck.mainboard,
                sideboard: originalDeck.sideboard,
              }}
              suggested={suggestedDeck}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Side by side view */}
      <TabsContent value="side-by-side" className="mt-4">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Original deck */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Original Deck</span>
                <Badge variant="outline">{stats.original.mainboard} cards</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Commanders */}
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">
                  Commanders ({stats.original.commanders})
                </h4>
                <ul className="text-sm space-y-1">
                  {originalDeck.commanders.map((c) => (
                    <li key={c.id}>1x {c.name}</li>
                  ))}
                </ul>
              </div>

              {/* Mainboard */}
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">
                  Mainboard ({stats.original.mainboard})
                </h4>
                <ul className="text-sm space-y-1 max-h-[400px] overflow-y-auto">
                  {originalDeck.mainboard.map((dc) => (
                    <li key={dc.card.id}>
                      {dc.quantity}x {dc.card.name}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sideboard */}
              {originalDeck.sideboard.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">
                    Sideboard ({stats.original.sideboard})
                  </h4>
                  <ul className="text-sm space-y-1">
                    {originalDeck.sideboard.map((dc) => (
                      <li key={dc.card.id}>
                        {dc.quantity}x {dc.card.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Suggested deck */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>AI Suggestion</span>
                <Badge variant="outline">{stats.suggested.mainboard} cards</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Commanders */}
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">
                  Commanders ({stats.suggested.commanders})
                </h4>
                <ul className="text-sm space-y-1">
                  {suggestedDeck.commanders.map((c) => (
                    <li key={c.name}>
                      {c.quantity}x {c.name}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mainboard */}
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">
                  Mainboard ({stats.suggested.mainboard})
                </h4>
                <ul className="text-sm space-y-1 max-h-[400px] overflow-y-auto">
                  {suggestedDeck.mainboard.map((c) => (
                    <li key={c.name}>
                      {c.quantity}x {c.name}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sideboard */}
              {suggestedDeck.sideboard.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">
                    Sideboard ({stats.suggested.sideboard})
                  </h4>
                  <ul className="text-sm space-y-1">
                    {suggestedDeck.sideboard.map((c) => (
                      <li key={c.name}>
                        {c.quantity}x {c.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
