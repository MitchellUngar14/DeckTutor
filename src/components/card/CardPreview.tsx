'use client';

import { CardImage } from './CardImage';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ManaText } from '@/components/ui/mana-symbol';
import { cn } from '@/lib/utils';
import { MTG_COLOR_MAP, type Card, type CardFace, type MtgColor } from '@/types';

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
