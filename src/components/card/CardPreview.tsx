'use client';

import { useMemo } from 'react';
import { CardImage } from './CardImage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ManaText } from '@/components/ui/mana-symbol';
import { cn } from '@/lib/utils';
import { useDeckStore } from '@/stores/deckStore';
import { MTG_COLOR_MAP, type Card, type CardFace, type MtgColor } from '@/types';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// Layouts that have two distinct faces with separate images
const DOUBLE_FACED_LAYOUTS = [
  'transform',
  'modal_dfc',
  'reversible_card',
  'double_faced_token',
];

interface CardPreviewProps {
  card: Card | null;
  className?: string;
}

function FaceDetails({ face, label }: { face: CardFace; label: string }) {
  return (
    <div className="space-y-2 rounded-lg bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">{label}</Badge>
        {face.manaCost && <ManaText text={face.manaCost} symbolSize={14} />}
      </div>
      <div>
        <h4 className="font-medium">{face.name}</h4>
        <p className="text-xs text-muted-foreground">{face.typeLine}</p>
      </div>
      {face.oracleText && (
        <p className="text-sm whitespace-pre-line">
          <ManaText text={face.oracleText} symbolSize={12} />
        </p>
      )}
    </div>
  );
}

export function CardPreview({ card, className }: CardPreviewProps) {
  const { currentDeck, addCard, updateCardQuantity, removeCard } = useDeckStore();

  // Check if the card is in the deck
  const cardInDeck = useMemo(() => {
    if (!currentDeck || !card) return null;

    // Check commanders
    const inCommanders = currentDeck.commanders.find(c => c.name === card.name);
    if (inCommanders) return { board: 'commanders' as const, quantity: 1 };

    // Check mainboard
    const inMainboard = currentDeck.mainboard.find(dc => dc.card.name === card.name);
    if (inMainboard) return { board: 'mainboard' as const, quantity: inMainboard.quantity };

    // Check sideboard
    const inSideboard = currentDeck.sideboard.find(dc => dc.card.name === card.name);
    if (inSideboard) return { board: 'sideboard' as const, quantity: inSideboard.quantity };

    // Check maybeboard
    const inMaybeboard = currentDeck.maybeboard.find(dc => dc.card.name === card.name);
    if (inMaybeboard) return { board: 'maybeboard' as const, quantity: inMaybeboard.quantity };

    return null;
  }, [currentDeck, card]);

  const handleAddToDeck = (board: 'mainboard' | 'sideboard' | 'maybeboard') => {
    if (!card) return;
    addCard(card, board);
    toast.success(`Added ${card.name} to ${board}`);
  };

  const handleIncrement = () => {
    if (!card || !cardInDeck || cardInDeck.board === 'commanders') return;
    updateCardQuantity(card.id, cardInDeck.board, cardInDeck.quantity + 1);
  };

  const handleDecrement = () => {
    if (!card || !cardInDeck || cardInDeck.board === 'commanders') return;
    if (cardInDeck.quantity > 1) {
      updateCardQuantity(card.id, cardInDeck.board, cardInDeck.quantity - 1);
    }
  };

  const handleRemove = () => {
    if (!card || !cardInDeck || cardInDeck.board === 'commanders') return;
    removeCard(card.id, cardInDeck.board);
    toast.success(`Removed ${card.name} from ${cardInDeck.board}`);
  };

  if (!card) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/50 p-8 text-center text-muted-foreground min-h-[400px]',
          className
        )}
      >
        <p>Click a card to preview</p>
      </div>
    );
  }

  const isDoubleFaced = DOUBLE_FACED_LAYOUTS.includes(card.layout) &&
    card.cardFaces &&
    card.cardFaces.length >= 2;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex justify-center">
        <CardImage card={card} size="large" priority />
      </div>

      {isDoubleFaced && (
        <p className="text-xs text-center text-muted-foreground">
          Hover over card and click the flip button to see other side
        </p>
      )}

      {/* Add to Deck / In Deck indicator */}
      {currentDeck && (
        <div className="space-y-2">
          {cardInDeck ? (
            <div className="space-y-2">
              <p className="text-xs text-center text-muted-foreground capitalize">
                In {cardInDeck.board}
              </p>
              {cardInDeck.board === 'commanders' ? (
                <p className="text-center text-sm text-muted-foreground">
                  Commander cannot be removed
                </p>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDecrement}
                    disabled={cardInDeck.quantity <= 1}
                    className="h-8 w-8 p-0"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-mono text-lg font-bold">
                    {cardInDeck.quantity}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleIncrement}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleRemove}
                    className="h-8 px-3 ml-2"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-center text-muted-foreground">Add to deck:</p>
              <div className="flex gap-2 justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddToDeck('mainboard')}
                  className="flex-1"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Mainboard
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddToDeck('sideboard')}
                  className="flex-1"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Sideboard
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {/* Show face details for double-faced cards */}
        {isDoubleFaced && card.cardFaces ? (
          <div className="space-y-3">
            <FaceDetails face={card.cardFaces[0]} label="Front" />
            <FaceDetails face={card.cardFaces[1]} label="Back" />
          </div>
        ) : (
          /* Regular card details */
          <>
            <div>
              <h3 className="text-lg font-semibold">{card.name}</h3>
              <p className="text-sm text-muted-foreground">{card.typeLine}</p>
            </div>

            {card.manaCost && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Mana Cost:</span>
                <ManaText text={card.manaCost} symbolSize={18} />
              </div>
            )}

            {card.oracleText && (
              <>
                <Separator />
                <div className="space-y-1">
                  <span className="text-sm font-medium">Oracle Text:</span>
                  <p className="text-sm whitespace-pre-line">
                    <ManaText text={card.oracleText} symbolSize={14} />
                  </p>
                </div>
              </>
            )}
          </>
        )}

        {card.colorIdentity.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Color Identity:</span>
            <div className="flex gap-1">
              {card.colorIdentity.map((color) => (
                <div
                  key={color}
                  className="h-5 w-5 rounded-full border border-border"
                  style={{
                    backgroundColor:
                      MTG_COLOR_MAP[color as MtgColor]?.hex || '#CAC5C0',
                  }}
                  title={MTG_COLOR_MAP[color as MtgColor]?.name || 'Colorless'}
                />
              ))}
            </div>
          </div>
        )}

        <Separator />

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{card.rarity}</Badge>
          <Badge variant="outline">{card.setName}</Badge>
          {card.edhrecRank && (
            <Badge variant="outline">EDHREC Rank: #{card.edhrecRank}</Badge>
          )}
        </div>

        {card.prices?.usd && (
          <div className="text-sm">
            <span className="font-medium">Price: </span>
            <span className="text-green-600 dark:text-green-400">
              ${card.prices.usd}
            </span>
          </div>
        )}

        {card.keywords && card.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.keywords.map((keyword) => (
              <Badge key={keyword} variant="outline" className="text-xs">
                {keyword}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
