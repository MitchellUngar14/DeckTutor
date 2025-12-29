'use client';

import { useMemo } from 'react';
import { DeckCard } from './DeckCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useDeckStore, type GroupBy, type SortBy } from '@/stores/deckStore';
import type { DeckCard as DeckCardType } from '@/types';

interface DeckListProps {
  cards: DeckCardType[];
  className?: string;
}

function sortCards(cards: DeckCardType[], sortBy: SortBy): DeckCardType[] {
  return [...cards].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.card.name.localeCompare(b.card.name);
      case 'cmc':
        return a.card.cmc - b.card.cmc;
      case 'type':
        return a.card.typeLine.localeCompare(b.card.typeLine);
      case 'color':
        return a.card.colorIdentity.join('').localeCompare(b.card.colorIdentity.join(''));
      default:
        return 0;
    }
  });
}

function groupCards(
  cards: DeckCardType[],
  groupBy: GroupBy
): Record<string, DeckCardType[]> {
  if (groupBy === 'none') {
    return { 'All Cards': cards };
  }

  const groups: Record<string, DeckCardType[]> = {};

  for (const card of cards) {
    let key: string;

    switch (groupBy) {
      case 'type': {
        const typeLine = card.card.typeLine.split(' — ')[0];
        if (typeLine.includes('Creature')) key = 'Creatures';
        else if (typeLine.includes('Instant')) key = 'Instants';
        else if (typeLine.includes('Sorcery')) key = 'Sorceries';
        else if (typeLine.includes('Artifact')) key = 'Artifacts';
        else if (typeLine.includes('Enchantment')) key = 'Enchantments';
        else if (typeLine.includes('Planeswalker')) key = 'Planeswalkers';
        else if (typeLine.includes('Land')) key = 'Lands';
        else key = 'Other';
        break;
      }
      case 'cmc':
        key = card.card.cmc >= 7 ? '7+' : String(Math.floor(card.card.cmc));
        break;
      case 'color':
        key = card.card.colorIdentity.length === 0
          ? 'Colorless'
          : card.card.colorIdentity.length > 1
          ? 'Multicolor'
          : card.card.colorIdentity[0];
        break;
      default:
        key = 'All Cards';
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(card);
  }

  return groups;
}

const TYPE_ORDER = [
  'Creatures',
  'Planeswalkers',
  'Instants',
  'Sorceries',
  'Artifacts',
  'Enchantments',
  'Lands',
  'Other',
];

const CMC_ORDER = ['0', '1', '2', '3', '4', '5', '6', '7+'];

const COLOR_ORDER = ['W', 'U', 'B', 'R', 'G', 'Multicolor', 'Colorless'];

function getGroupOrder(groupBy: GroupBy): string[] {
  switch (groupBy) {
    case 'type':
      return TYPE_ORDER;
    case 'cmc':
      return CMC_ORDER;
    case 'color':
      return COLOR_ORDER;
    default:
      return [];
  }
}

export function DeckList({ cards, className }: DeckListProps) {
  const { viewMode, sortBy, groupBy } = useDeckStore();

  const { groupedCards, sortedGroups } = useMemo(() => {
    const sorted = sortCards(cards, sortBy);
    const grouped = groupCards(sorted, groupBy);
    const order = getGroupOrder(groupBy);

    const sortedGroupNames = Object.keys(grouped).sort((a, b) => {
      const aIndex = order.indexOf(a);
      const bIndex = order.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    return { groupedCards: grouped, sortedGroups: sortedGroupNames };
  }, [cards, sortBy, groupBy]);

  const totalCards = cards.reduce((sum, c) => sum + c.quantity, 0);

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="space-y-4 p-4">
        <div className="text-sm text-muted-foreground">
          {totalCards} cards total
        </div>

        {sortedGroups.map((groupName) => {
          const groupCards = groupedCards[groupName];
          const groupCount = groupCards.reduce((sum, c) => sum + c.quantity, 0);

          return (
            <div key={groupName} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">
                  {groupName}
                </h3>
                <span className="text-xs text-muted-foreground">
                  ({groupCount})
                </span>
              </div>

              <div
                className={cn(
                  viewMode === 'grid' && 'grid gap-2 justify-start',
                  viewMode === 'visual' && 'grid gap-3 justify-start',
                  viewMode === 'list' && 'space-y-1'
                )}
                style={
                  viewMode === 'grid'
                    ? { gridTemplateColumns: 'repeat(auto-fill, 146px)' }
                    : viewMode === 'visual'
                    ? { gridTemplateColumns: 'repeat(auto-fill, 244px)' }
                    : undefined
                }
              >
                {groupCards.map((deckCard) => (
                  <DeckCard
                    key={`${deckCard.card.id}-${deckCard.board}`}
                    deckCard={deckCard}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
