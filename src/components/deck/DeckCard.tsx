'use client';

import { useMemo } from 'react';
import { CardImage } from '@/components/card/CardImage';
import { Button } from '@/components/ui/button';
import { ManaText } from '@/components/ui/mana-symbol';
import { cn } from '@/lib/utils';
import { useDeckStore } from '@/stores/deckStore';
import type { DeckCard as DeckCardType } from '@/types';

interface DeckCardProps {
  deckCard: DeckCardType;
  viewMode: 'grid' | 'list' | 'visual';
}

export function DeckCard({ deckCard, viewMode }: DeckCardProps) {
  const { card, quantity, board } = deckCard;
  const { selectedCard, setSelectedCard, updateCardQuantity, removeCard, savedDeckSnapshot } = useDeckStore();

  // Check if this card is a pending addition (not in saved snapshot)
  const isPendingAddition = useMemo(() => {
    if (!savedDeckSnapshot) return false; // New deck, nothing to compare

    // Check if this card exists in the saved snapshot
    const checkBoard = (boardCards: typeof savedDeckSnapshot.mainboard) => {
      return boardCards.some(dc => dc.card.id === card.id);
    };

    // Check commanders
    if (savedDeckSnapshot.commanders.some(c => c.id === card.id)) {
      return false; // Card exists in saved snapshot
    }

    // Check the appropriate board
    if (board === 'mainboard' && checkBoard(savedDeckSnapshot.mainboard)) return false;
    if (board === 'sideboard' && checkBoard(savedDeckSnapshot.sideboard)) return false;
    if (board === 'maybeboard' && checkBoard(savedDeckSnapshot.maybeboard)) return false;

    // Card not found in saved snapshot - it's a pending addition
    return true;
  }, [savedDeckSnapshot, card.id, board]);

  const isSelected = selectedCard?.id === card.id;

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateCardQuantity(card.id, board, quantity + 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (quantity > 1) {
      updateCardQuantity(card.id, board, quantity - 1);
    } else {
      removeCard(card.id, board);
    }
  };

  if (viewMode === 'grid') {
    return (
      <div
        className={cn(
          'relative group cursor-pointer rounded-lg transition-all',
          isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
        )}
        onClick={() => setSelectedCard(isSelected ? null : card)}
      >
        <CardImage card={card} size="small" />
        {quantity > 1 && (
          <div className="absolute bottom-1 right-1 bg-background/90 rounded-full px-2 py-0.5 text-xs font-bold">
            x{quantity}
          </div>
        )}
        {/* Pending addition indicator */}
        {isPendingAddition && (
          <div
            className="absolute top-1 left-1 h-3 w-3 rounded-full bg-amber-500 border border-amber-600 shadow-sm"
            title="Unsaved addition"
          />
        )}
        {/* Hover controls */}
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
          <Button
            variant="secondary"
            size="sm"
            className="h-6 w-6 p-0 text-xs shadow-md"
            onClick={handleIncrement}
          >
            +
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-6 w-6 p-0 text-xs shadow-md"
            onClick={handleDecrement}
          >
            -
          </Button>
        </div>
      </div>
    );
  }

  if (viewMode === 'visual') {
    return (
      <div
        className={cn(
          'relative group cursor-pointer rounded-lg transition-all',
          isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
        )}
        onClick={() => setSelectedCard(isSelected ? null : card)}
      >
        <CardImage card={card} size="normal" />
        {quantity > 1 && (
          <div className="absolute bottom-2 right-2 bg-background/90 rounded-full px-3 py-1 text-sm font-bold shadow">
            x{quantity}
          </div>
        )}
        {/* Pending addition indicator */}
        {isPendingAddition && (
          <div
            className="absolute top-2 left-2 h-4 w-4 rounded-full bg-amber-500 border-2 border-amber-600 shadow"
            title="Unsaved addition"
          />
        )}
        {/* Hover controls */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <Button
            variant="secondary"
            size="sm"
            className="h-8 w-8 p-0 text-sm shadow-md"
            onClick={handleIncrement}
          >
            +
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-8 w-8 p-0 text-sm shadow-md"
            onClick={handleDecrement}
          >
            -
          </Button>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 group cursor-pointer',
        'border border-transparent hover:border-border',
        isSelected && 'bg-muted border-primary'
      )}
      onClick={() => setSelectedCard(isSelected ? null : card)}
    >
      {/* Pending addition indicator */}
      {isPendingAddition ? (
        <div
          className="h-2.5 w-2.5 rounded-full bg-amber-500 flex-shrink-0"
          title="Unsaved addition"
        />
      ) : (
        <div className="w-2.5 flex-shrink-0" />
      )}

      <span className="w-6 text-center font-mono text-sm text-muted-foreground">
        {quantity}x
      </span>

      <div className="w-20 flex-shrink-0">
        {card.manaCost && (
          <ManaText text={card.manaCost} symbolSize={16} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{card.name}</p>
        <p className="text-xs text-muted-foreground truncate">{card.typeLine}</p>
      </div>

      <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={handleIncrement}
        >
          +
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={handleDecrement}
        >
          -
        </Button>
      </div>
    </div>
  );
}
