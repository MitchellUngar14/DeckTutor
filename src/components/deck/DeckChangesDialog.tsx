'use client';

import { useMemo, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { CardImage } from '@/components/card/CardImage';
import { ManaText } from '@/components/ui/mana-symbol';
import { cn } from '@/lib/utils';
import type { Deck, DeckCard, Card } from '@/types';

interface CardChange {
  card: Card;
  quantity: number;
  board: DeckCard['board'];
}

export interface DeckChanges {
  additions: CardChange[];
  removals: CardChange[];
}

export function computeDeckChanges(
  currentDeck: Deck | null,
  savedSnapshot: Deck | null
): DeckChanges {
  const additions: CardChange[] = [];
  const removals: CardChange[] = [];

  if (!currentDeck) {
    return { additions, removals };
  }

  // If no saved snapshot, everything is an addition (new deck)
  if (!savedSnapshot) {
    return { additions: [], removals: [] };
  }

  // Create maps of card quantities for comparison
  const createCardMap = (deck: Deck): Map<string, { card: Card; quantity: number; board: DeckCard['board'] }> => {
    const map = new Map<string, { card: Card; quantity: number; board: DeckCard['board'] }>();

    // Commanders
    for (const commander of deck.commanders) {
      const key = `${commander.id}-commanders`;
      map.set(key, { card: commander, quantity: 1, board: 'commanders' });
    }

    // All boards
    const boards: Array<{ cards: DeckCard[]; boardName: DeckCard['board'] }> = [
      { cards: deck.mainboard, boardName: 'mainboard' },
      { cards: deck.sideboard, boardName: 'sideboard' },
      { cards: deck.maybeboard, boardName: 'maybeboard' },
    ];

    for (const { cards, boardName } of boards) {
      for (const dc of cards) {
        const key = `${dc.card.id}-${boardName}`;
        map.set(key, { card: dc.card, quantity: dc.quantity, board: boardName });
      }
    }

    return map;
  };

  const currentMap = createCardMap(currentDeck);
  const savedMap = createCardMap(savedSnapshot);

  // Find additions (cards in current but not in saved, or increased quantity)
  for (const [key, current] of currentMap) {
    const saved = savedMap.get(key);
    if (!saved) {
      // Card is completely new
      additions.push({ card: current.card, quantity: current.quantity, board: current.board });
    } else if (current.quantity > saved.quantity) {
      // Quantity increased
      additions.push({ card: current.card, quantity: current.quantity - saved.quantity, board: current.board });
    }
  }

  // Find removals (cards in saved but not in current, or decreased quantity)
  for (const [key, saved] of savedMap) {
    const current = currentMap.get(key);
    if (!current) {
      // Card was completely removed
      removals.push({ card: saved.card, quantity: saved.quantity, board: saved.board });
    } else if (current.quantity < saved.quantity) {
      // Quantity decreased
      removals.push({ card: saved.card, quantity: saved.quantity - current.quantity, board: saved.board });
    }
  }

  return { additions, removals };
}

interface CardChangeRowProps {
  change: CardChange;
  type: 'addition' | 'removal';
  isSelected: boolean;
  onSelect: () => void;
}

function CardChangeRow({ change, type, isSelected, onSelect }: CardChangeRowProps) {
  const isAddition = type === 'addition';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors',
        'border-l-4',
        isAddition
          ? 'border-l-green-500 bg-green-500/5 hover:bg-green-500/10'
          : 'border-l-red-500 bg-red-500/5 hover:bg-red-500/10',
        isSelected && (isAddition ? 'bg-green-500/20' : 'bg-red-500/20')
      )}
    >
      {/* +/- indicator */}
      <span
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white',
          isAddition ? 'bg-green-600' : 'bg-red-600'
        )}
      >
        {isAddition ? '+' : '-'}
      </span>

      {/* Quantity */}
      <span className="flex-shrink-0 w-6 text-center font-mono text-muted-foreground text-sm">
        {change.quantity}x
      </span>

      {/* Mana cost - hidden on mobile */}
      {change.card.manaCost && (
        <span className="hidden sm:block flex-shrink-0">
          <ManaText text={change.card.manaCost} symbolSize={14} />
        </span>
      )}

      {/* Card name - ensure it's visible */}
      <span className="font-medium overflow-hidden text-ellipsis whitespace-nowrap">
        {change.card.name}
      </span>

      {/* Spacer to push board to the right */}
      <span className="flex-1" />

      {/* Board indicator - hidden on mobile */}
      <span className="hidden sm:block flex-shrink-0 text-xs text-muted-foreground capitalize">
        {change.board}
      </span>
    </button>
  );
}

interface DeckChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: DeckChanges;
  onConfirm: () => void;
  onUndo?: () => void;
  isLoading?: boolean;
}

export function DeckChangesDialog({
  open,
  onOpenChange,
  changes,
  onConfirm,
  onUndo,
  isLoading = false,
}: DeckChangesDialogProps) {
  const { additions, removals } = changes;
  const hasAdditions = additions.length > 0;
  const hasRemovals = removals.length > 0;
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const title = useMemo(() => {
    if (hasAdditions && hasRemovals) {
      return 'Review Deck Changes';
    } else if (hasRemovals) {
      return 'Confirm Card Removal';
    }
    return 'Confirm Changes';
  }, [hasAdditions, hasRemovals]);

  const description = useMemo(() => {
    const addCount = additions.reduce((sum, a) => sum + a.quantity, 0);
    const removeCount = removals.reduce((sum, r) => sum + r.quantity, 0);

    if (hasAdditions && hasRemovals) {
      return `+${addCount} added, -${removeCount} removed. Click a card to preview.`;
    } else if (hasRemovals) {
      return `${removeCount} card${removeCount !== 1 ? 's' : ''} will be removed. Click to preview.`;
    }
    return 'Confirm the changes to your deck.';
  }, [hasAdditions, hasRemovals, additions, removals]);

  // Reset selected card when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedCard(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="!w-[95vw] !max-w-[1200px] max-h-[90vh] flex flex-col overflow-hidden p-0">
        <AlertDialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6 flex-shrink-0">
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden border-t">
          {/* Changes list */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden md:border-r min-w-0">
            {/* Removals */}
            {hasRemovals && (
              <div>
                <div className="sticky top-0 bg-background/95 backdrop-blur px-4 py-2 border-b">
                  <h3 className="font-semibold text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                    <span>Removing</span>
                    <span className="bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {removals.reduce((sum, r) => sum + r.quantity, 0)}
                    </span>
                  </h3>
                </div>
                <div className="divide-y">
                  {removals.map((removal, idx) => (
                    <CardChangeRow
                      key={`removal-${removal.card.id}-${removal.board}-${idx}`}
                      change={removal}
                      type="removal"
                      isSelected={selectedCard?.id === removal.card.id}
                      onSelect={() => setSelectedCard(removal.card)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Additions */}
            {hasAdditions && (
              <div>
                <div className="sticky top-0 bg-background/95 backdrop-blur px-4 py-2 border-b">
                  <h3 className="font-semibold text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
                    <span>Adding</span>
                    <span className="bg-green-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {additions.reduce((sum, a) => sum + a.quantity, 0)}
                    </span>
                  </h3>
                </div>
                <div className="divide-y">
                  {additions.map((addition, idx) => (
                    <CardChangeRow
                      key={`addition-${addition.card.id}-${addition.board}-${idx}`}
                      change={addition}
                      type="addition"
                      isSelected={selectedCard?.id === addition.card.id}
                      onSelect={() => setSelectedCard(addition.card)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card preview panel */}
          <div className="hidden md:flex flex-shrink-0 w-48 flex-col items-center justify-center p-3 bg-muted/30">
            {selectedCard ? (
              <div className="space-y-1 text-center">
                <CardImage card={selectedCard} size="small" />
                <p className="text-xs font-medium leading-tight">{selectedCard.name}</p>
                <p className="text-xs text-muted-foreground leading-tight">{selectedCard.typeLine}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center">
                Click a card to preview
              </p>
            )}
          </div>
        </div>

        {/* Mobile preview - shown at bottom when card selected */}
        {selectedCard && (
          <div className="md:hidden border-t p-3 flex items-center gap-3 bg-muted/30">
            <div className="w-16 flex-shrink-0">
              <CardImage card={selectedCard} size="small" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{selectedCard.name}</p>
              <p className="text-xs text-muted-foreground truncate">{selectedCard.typeLine}</p>
              {selectedCard.manaCost && (
                <ManaText text={selectedCard.manaCost} symbolSize={12} className="mt-1" />
              )}
            </div>
          </div>
        )}

        <AlertDialogFooter className="px-4 pb-4 sm:px-6 sm:pb-6 flex-shrink-0 border-t pt-4">
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <div>
              {onUndo && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    onUndo();
                    onOpenChange(false);
                  }}
                  disabled={isLoading}
                >
                  Undo All Changes
                </Button>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onConfirm} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Confirm Changes'}
              </AlertDialogAction>
            </div>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
