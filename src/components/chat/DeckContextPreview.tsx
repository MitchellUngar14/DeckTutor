'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Layers, Sparkles, Puzzle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ManaSymbol } from '@/components/ui/mana-symbol';
import type { DeckContext } from '@/types';

interface DeckContextPreviewProps {
  deckContext: DeckContext;
}

export function DeckContextPreview({ deckContext }: DeckContextPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-b bg-muted/20">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm">
          <Layers className="h-4 w-4" />
          <span className="font-medium">{deckContext.deckName}</span>
          <div className="flex gap-0.5">
            {deckContext.colorIdentity.map((color) => (
              <ManaSymbol key={color} symbol={`{${color}}`} size={14} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {deckContext.stats.cardCount} cards
          </Badge>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 text-sm">
          {/* Commander(s) */}
          <div>
            <span className="text-muted-foreground">Commander: </span>
            <span className="font-medium">{deckContext.commanders.join(', ')}</span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground">Avg CMC: </span>
              <span>{deckContext.stats.averageCmc.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Format: </span>
              <span className="capitalize">{deckContext.format}</span>
            </div>
          </div>

          {/* Mana curve mini view */}
          <div>
            <span className="text-muted-foreground block mb-1">Mana Curve:</span>
            <div className="flex gap-1 items-end h-8">
              {Object.entries(deckContext.stats.manaCurve)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([cmc, count]) => {
                  const maxCount = Math.max(...Object.values(deckContext.stats.manaCurve));
                  const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  return (
                    <div key={cmc} className="flex flex-col items-center">
                      <div
                        className="w-4 bg-primary/60 rounded-t"
                        style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                        title={`${cmc}: ${count} cards`}
                      />
                      <span className="text-xs text-muted-foreground">{cmc}</span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Synergies count */}
          <div className="flex gap-4">
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Synergies:</span>
              <span>{deckContext.synergies.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <Puzzle className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Combos:</span>
              <span>{deckContext.combos.length}</span>
            </div>
            {deckContext.potentialCombos.length > 0 && (
              <div className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Potential:</span>
                <span>{deckContext.potentialCombos.length}</span>
              </div>
            )}
          </div>

          {/* Context note */}
          <p className="text-xs text-muted-foreground italic">
            This deck information is shared with the AI to provide personalized advice.
          </p>
        </div>
      )}
    </div>
  );
}
