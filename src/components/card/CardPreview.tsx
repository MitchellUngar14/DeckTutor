'use client';

import { CardImage } from './CardImage';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { MTG_COLOR_MAP, type Card, type MtgColor } from '@/types';

interface CardPreviewProps {
  card: Card | null;
  className?: string;
}

export function CardPreview({ card, className }: CardPreviewProps) {
  if (!card) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/50 p-8 text-center text-muted-foreground',
          className
        )}
      >
        <p>Hover over a card to preview</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex justify-center">
        <CardImage card={card} size="large" priority />
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold">{card.name}</h3>
          <p className="text-sm text-muted-foreground">{card.typeLine}</p>
        </div>

        {card.manaCost && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Mana Cost:</span>
            <span className="font-mono">{card.manaCost}</span>
          </div>
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

        {card.oracleText && (
          <>
            <Separator />
            <div className="space-y-1">
              <span className="text-sm font-medium">Oracle Text:</span>
              <p className="text-sm whitespace-pre-line">{card.oracleText}</p>
            </div>
          </>
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
