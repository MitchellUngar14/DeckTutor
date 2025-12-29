'use client';

import { CardImage } from '@/components/card/CardImage';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDeckStore } from '@/stores/deckStore';
import type { DeckCard as DeckCardType } from '@/types';

interface DeckCardProps {
  deckCard: DeckCardType;
  viewMode: 'grid' | 'list' | 'visual';
}

export function DeckCard({ deckCard, viewMode }: DeckCardProps) {
  const { card, quantity, board } = deckCard;
  const { setHoveredCard, updateCardQuantity, removeCard } = useDeckStore();

  if (viewMode === 'grid') {
    return (
      <div
        className="relative group"
        onMouseEnter={() => setHoveredCard(card)}
        onMouseLeave={() => setHoveredCard(null)}
      >
        <CardImage card={card} size="small" />
        {quantity > 1 && (
          <div className="absolute bottom-1 right-1 bg-background/90 rounded-full px-2 py-0.5 text-xs font-bold">
            x{quantity}
          </div>
        )}
      </div>
    );
  }

  if (viewMode === 'visual') {
    return (
      <div
        className="relative group"
        onMouseEnter={() => setHoveredCard(card)}
        onMouseLeave={() => setHoveredCard(null)}
      >
        <CardImage card={card} size="normal" />
        {quantity > 1 && (
          <div className="absolute bottom-2 right-2 bg-background/90 rounded-full px-3 py-1 text-sm font-bold shadow">
            x{quantity}
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 group cursor-pointer',
        'border border-transparent hover:border-border'
      )}
      onMouseEnter={() => setHoveredCard(card)}
      onMouseLeave={() => setHoveredCard(null)}
    >
      <span className="w-6 text-center font-mono text-sm text-muted-foreground">
        {quantity}x
      </span>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{card.name}</p>
        <p className="text-xs text-muted-foreground truncate">{card.typeLine}</p>
      </div>

      {card.manaCost && (
        <span className="font-mono text-sm text-muted-foreground">
          {card.manaCost}
        </span>
      )}

      <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => updateCardQuantity(card.id, board, quantity + 1)}
        >
          +
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => {
            if (quantity > 1) {
              updateCardQuantity(card.id, board, quantity - 1);
            } else {
              removeCard(card.id, board);
            }
          }}
        >
          -
        </Button>
      </div>
    </div>
  );
}
