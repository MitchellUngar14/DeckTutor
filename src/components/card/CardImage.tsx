'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Card } from '@/types';

interface CardImageProps {
  card: Card;
  size?: 'small' | 'normal' | 'large';
  priority?: boolean;
  className?: string;
  onClick?: () => void;
}

const SIZES = {
  small: { width: 146, height: 204 },
  normal: { width: 244, height: 340 },
  large: { width: 336, height: 468 },
};

const CARD_BACK_URL = 'https://cards.scryfall.io/large/back/5/2/5200d7af-84c0-4697-8716-0bb4a9ff9ed5.jpg';

export function CardImage({
  card,
  size = 'normal',
  priority = false,
  className,
  onClick,
}: CardImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const dimensions = SIZES[size];
  const imageUrl = card.imageUris?.[size === 'small' ? 'small' : size === 'large' ? 'large' : 'normal'];

  if (!imageUrl || hasError) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-[4.75%] bg-muted',
          className
        )}
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        <Image
          src={CARD_BACK_URL}
          alt="Card back"
          width={dimensions.width}
          height={dimensions.height}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[4.75%] transition-transform duration-200',
        onClick && 'cursor-pointer hover:scale-105 hover:z-10 hover:shadow-xl',
        className
      )}
      style={{ width: dimensions.width, height: dimensions.height }}
      onClick={onClick}
    >
      {isLoading && (
        <Skeleton
          className="absolute inset-0 rounded-[4.75%]"
          style={{ width: dimensions.width, height: dimensions.height }}
        />
      )}
      <Image
        src={imageUrl}
        alt={card.name}
        width={dimensions.width}
        height={dimensions.height}
        priority={priority}
        className={cn(
          'object-cover transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </div>
  );
}
