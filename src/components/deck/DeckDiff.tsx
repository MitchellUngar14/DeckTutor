'use client';

import { useMemo } from 'react';
import { Plus, Minus, Equal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ParsedDeckSuggestion, DeckCard } from '@/types';

interface DeckDiffProps {
  original: {
    commanders: string[];
    mainboard: DeckCard[];
    sideboard: DeckCard[];
  };
  suggested: ParsedDeckSuggestion;
}

interface DiffItem {
  name: string;
  originalQty: number;
  suggestedQty: number;
  change: 'added' | 'removed' | 'unchanged' | 'changed';
}

export function DeckDiff({ original, suggested }: DeckDiffProps) {
  const { commanderDiff, mainboardDiff, sideboardDiff, stats } = useMemo(() => {
    // Build commander diff
    const originalCommanderSet = new Set(original.commanders.map((c) => c.toLowerCase()));
    const suggestedCommanderSet = new Set(
      suggested.commanders.map((c) => c.name.toLowerCase())
    );

    const commanderDiff: DiffItem[] = [];

    // Original commanders
    for (const name of original.commanders) {
      const lowerName = name.toLowerCase();
      if (suggestedCommanderSet.has(lowerName)) {
        commanderDiff.push({ name, originalQty: 1, suggestedQty: 1, change: 'unchanged' });
      } else {
        commanderDiff.push({ name, originalQty: 1, suggestedQty: 0, change: 'removed' });
      }
    }

    // Added commanders
    for (const card of suggested.commanders) {
      if (!originalCommanderSet.has(card.name.toLowerCase())) {
        commanderDiff.push({
          name: card.name,
          originalQty: 0,
          suggestedQty: card.quantity,
          change: 'added',
        });
      }
    }

    // Build mainboard diff
    const originalMainboard = new Map<string, number>();
    for (const dc of original.mainboard) {
      originalMainboard.set(dc.card.name.toLowerCase(), dc.quantity);
    }

    const suggestedMainboard = new Map<string, number>();
    for (const card of suggested.mainboard) {
      suggestedMainboard.set(card.name.toLowerCase(), card.quantity);
    }

    const mainboardDiff: DiffItem[] = [];
    const allMainboardCards = new Set([
      ...originalMainboard.keys(),
      ...suggestedMainboard.keys(),
    ]);

    for (const lowerName of allMainboardCards) {
      const originalQty = originalMainboard.get(lowerName) || 0;
      const suggestedQty = suggestedMainboard.get(lowerName) || 0;

      // Get the proper-case name
      const originalCard = original.mainboard.find(
        (dc) => dc.card.name.toLowerCase() === lowerName
      );
      const suggestedCard = suggested.mainboard.find(
        (c) => c.name.toLowerCase() === lowerName
      );
      const name = originalCard?.card.name || suggestedCard?.name || lowerName;

      if (originalQty === 0) {
        mainboardDiff.push({ name, originalQty, suggestedQty, change: 'added' });
      } else if (suggestedQty === 0) {
        mainboardDiff.push({ name, originalQty, suggestedQty, change: 'removed' });
      } else if (originalQty !== suggestedQty) {
        mainboardDiff.push({ name, originalQty, suggestedQty, change: 'changed' });
      } else {
        mainboardDiff.push({ name, originalQty, suggestedQty, change: 'unchanged' });
      }
    }

    // Build sideboard diff
    const originalSideboard = new Map<string, number>();
    for (const dc of original.sideboard) {
      originalSideboard.set(dc.card.name.toLowerCase(), dc.quantity);
    }

    const suggestedSideboard = new Map<string, number>();
    for (const card of suggested.sideboard) {
      suggestedSideboard.set(card.name.toLowerCase(), card.quantity);
    }

    const sideboardDiff: DiffItem[] = [];
    const allSideboardCards = new Set([
      ...originalSideboard.keys(),
      ...suggestedSideboard.keys(),
    ]);

    for (const lowerName of allSideboardCards) {
      const originalQty = originalSideboard.get(lowerName) || 0;
      const suggestedQty = suggestedSideboard.get(lowerName) || 0;

      const originalCard = original.sideboard.find(
        (dc) => dc.card.name.toLowerCase() === lowerName
      );
      const suggestedCard = suggested.sideboard.find(
        (c) => c.name.toLowerCase() === lowerName
      );
      const name = originalCard?.card.name || suggestedCard?.name || lowerName;

      if (originalQty === 0) {
        sideboardDiff.push({ name, originalQty, suggestedQty, change: 'added' });
      } else if (suggestedQty === 0) {
        sideboardDiff.push({ name, originalQty, suggestedQty, change: 'removed' });
      } else if (originalQty !== suggestedQty) {
        sideboardDiff.push({ name, originalQty, suggestedQty, change: 'changed' });
      } else {
        sideboardDiff.push({ name, originalQty, suggestedQty, change: 'unchanged' });
      }
    }

    // Sort: added first, then removed, then changed, then unchanged
    const sortDiff = (a: DiffItem, b: DiffItem) => {
      const order = { added: 0, removed: 1, changed: 2, unchanged: 3 };
      return order[a.change] - order[b.change];
    };

    commanderDiff.sort(sortDiff);
    mainboardDiff.sort(sortDiff);
    sideboardDiff.sort(sortDiff);

    // Calculate stats
    const addedCount = mainboardDiff.filter((d) => d.change === 'added').length;
    const removedCount = mainboardDiff.filter((d) => d.change === 'removed').length;
    const changedCount = mainboardDiff.filter((d) => d.change === 'changed').length;

    return {
      commanderDiff,
      mainboardDiff,
      sideboardDiff,
      stats: { addedCount, removedCount, changedCount },
    };
  }, [original, suggested]);

  const DiffBadge = ({ item }: { item: DiffItem }) => {
    switch (item.change) {
      case 'added':
        return (
          <div className="flex items-center gap-2 py-1 px-2 bg-green-500/10 rounded">
            <Plus className="h-4 w-4 text-green-600" />
            <span className="text-green-600">{item.suggestedQty}x</span>
            <span>{item.name}</span>
          </div>
        );
      case 'removed':
        return (
          <div className="flex items-center gap-2 py-1 px-2 bg-red-500/10 rounded">
            <Minus className="h-4 w-4 text-red-600" />
            <span className="text-red-600 line-through">{item.originalQty}x</span>
            <span className="line-through">{item.name}</span>
          </div>
        );
      case 'changed':
        return (
          <div className="flex items-center gap-2 py-1 px-2 bg-yellow-500/10 rounded">
            <span className="text-yellow-600">
              {item.originalQty} → {item.suggestedQty}x
            </span>
            <span>{item.name}</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 py-1 px-2 opacity-60">
            <Equal className="h-4 w-4" />
            <span>{item.originalQty}x</span>
            <span>{item.name}</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats summary */}
      <div className="flex gap-4 text-sm">
        <Badge variant="secondary" className="bg-green-500/10 text-green-600">
          +{stats.addedCount} added
        </Badge>
        <Badge variant="secondary" className="bg-red-500/10 text-red-600">
          -{stats.removedCount} removed
        </Badge>
        {stats.changedCount > 0 && (
          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
            ~{stats.changedCount} changed
          </Badge>
        )}
      </div>

      {/* Commanders */}
      {commanderDiff.some((d) => d.change !== 'unchanged') && (
        <div>
          <h3 className="font-semibold mb-2">Commanders</h3>
          <div className="space-y-1">
            {commanderDiff.map((item) => (
              <DiffBadge key={item.name} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Mainboard */}
      <div>
        <h3 className="font-semibold mb-2">Mainboard Changes</h3>
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {mainboardDiff
            .filter((d) => d.change !== 'unchanged')
            .map((item) => (
              <DiffBadge key={item.name} item={item} />
            ))}
          {mainboardDiff.filter((d) => d.change !== 'unchanged').length === 0 && (
            <p className="text-muted-foreground text-sm">No mainboard changes</p>
          )}
        </div>
      </div>

      {/* Sideboard */}
      {(sideboardDiff.length > 0 || suggested.sideboard.length > 0) && (
        <div>
          <h3 className="font-semibold mb-2">Sideboard Changes</h3>
          <div className="space-y-1">
            {sideboardDiff
              .filter((d) => d.change !== 'unchanged')
              .map((item) => (
                <DiffBadge key={item.name} item={item} />
              ))}
            {sideboardDiff.filter((d) => d.change !== 'unchanged').length === 0 && (
              <p className="text-muted-foreground text-sm">No sideboard changes</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
