'use client';

import Image from 'next/image';
import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
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

// Layouts that have two distinct faces with separate images
const DOUBLE_FACED_LAYOUTS = [
  'transform',
  'modal_dfc',
  'reversible_card',
  'double_faced_token',
];

export function CardImage({
  card,
  size = 'normal',
  priority = false,
  className,
  onClick,
}: CardImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [faceIndex, setFaceIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  const dimensions = SIZES[size];
  const sizeKey = size === 'small' ? 'small' : size === 'large' ? 'large' : 'normal';

  // Check if this is a double-faced card with separate face images
  const isDoubleFaced = DOUBLE_FACED_LAYOUTS.includes(card.layout) &&
    card.cardFaces &&
    card.cardFaces.length >= 2 &&
    card.cardFaces[0]?.imageUris &&
    card.cardFaces[1]?.imageUris;

  // Get the current image URL based on face
  const getImageUrl = () => {
    if (isDoubleFaced && card.cardFaces?.[faceIndex]?.imageUris) {
      return card.cardFaces[faceIndex].imageUris[sizeKey];
    }
    return card.imageUris?.[sizeKey];
  };

  const imageUrl = getImageUrl();

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDoubleFaced) return;

    setIsFlipping(true);
    setTimeout(() => {
      setFaceIndex((prev) => (prev === 0 ? 1 : 0));
      setTimeout(() => setIsFlipping(false), 150);
    }, 150);
  };

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
        'relative overflow-hidden rounded-[4.75%] transition-transform duration-200 group',
        onClick && 'cursor-pointer hover:scale-105 hover:z-10 hover:shadow-xl',
        className
      )}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        perspective: '1000px',
      }}
      onClick={onClick}
    >
      {isLoading && (
        <Skeleton
          className="absolute inset-0 rounded-[4.75%]"
          style={{ width: dimensions.width, height: dimensions.height }}
        />
      )}
      <div
        className={cn(
          'w-full h-full transition-transform duration-300',
          isFlipping && 'scale-x-0'
        )}
      >
        <Image
          src={imageUrl}
          alt={isDoubleFaced && card.cardFaces?.[faceIndex]
            ? card.cardFaces[faceIndex].name
            : card.name}
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

      {/* Flip button for double-faced cards */}
      {isDoubleFaced && (
        <button
          onClick={handleFlip}
          className={cn(
            'absolute bottom-2 right-2 p-1.5 rounded-full',
            'bg-black/70 text-white hover:bg-black/90',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            'focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/50'
          )}
          title={`Flip to ${card.cardFaces?.[faceIndex === 0 ? 1 : 0]?.name}`}
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
