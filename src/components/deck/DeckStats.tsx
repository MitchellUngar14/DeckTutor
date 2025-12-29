'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MTG_COLOR_MAP, type DeckStats as DeckStatsType, type MtgColor } from '@/types';

interface DeckStatsProps {
  stats: DeckStatsType;
}

export function DeckStatsSummary({ stats }: DeckStatsProps) {
  return (
    <div className="grid gap-3 grid-cols-2">
      <Card>
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">Cards</CardTitle>
        </CardHeader>
        <CardContent className="pb-3 px-3">
          <div className="text-xl font-bold">{stats.cardCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">Avg CMC</CardTitle>
        </CardHeader>
        <CardContent className="pb-3 px-3">
          <div className="text-xl font-bold">{stats.averageCmc.toFixed(2)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">Colors</CardTitle>
        </CardHeader>
        <CardContent className="pb-3 px-3">
          <div className="flex gap-1">
            {Object.entries(stats.colorDistribution)
              .filter(([, count]) => count > 0)
              .map(([color]) => (
                <div
                  key={color}
                  className="h-5 w-5 rounded-full border border-border"
                  style={{
                    backgroundColor:
                      color === 'C'
                        ? '#CAC5C0'
                        : MTG_COLOR_MAP[color as MtgColor]?.hex || '#CAC5C0',
                  }}
                  title={
                    color === 'C'
                      ? 'Colorless'
                      : MTG_COLOR_MAP[color as MtgColor]?.name || color
                  }
                />
              ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">Types</CardTitle>
        </CardHeader>
        <CardContent className="pb-3 px-3">
          <div className="flex flex-wrap gap-1">
            {Object.entries(stats.typeDistribution)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3)
              .map(([type, count]) => (
                <Badge key={type} variant="secondary" className="text-xs px-1.5 py-0">
                  {type.slice(0, 4)}: {count}
                </Badge>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ManaCurve({ stats }: DeckStatsProps) {
  const maxCurveValue = useMemo(() => {
    return Math.max(...Object.values(stats.manaCurve), 1);
  }, [stats.manaCurve]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Mana Curve</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2" style={{ height: '96px' }}>
          {Object.entries(stats.manaCurve)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([cmc, count]) => {
              const barHeight = maxCurveValue > 0 ? (count / maxCurveValue) * 64 : 0;
              return (
                <div key={cmc} className="flex flex-col items-center flex-1">
                  <div className="w-full flex items-end" style={{ height: '64px' }}>
                    <div
                      className="w-full bg-primary rounded-t transition-all"
                      style={{ height: `${barHeight}px`, minHeight: count > 0 ? '4px' : '0' }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{cmc === '7' ? '7+' : cmc}</div>
                  <div className="text-xs font-medium">{count}</div>
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}

export function DeckStats({ stats }: DeckStatsProps) {
  const maxCurveValue = useMemo(() => {
    return Math.max(...Object.values(stats.manaCurve), 1);
  }, [stats.manaCurve]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Cards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.cardCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Average CMC</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.averageCmc.toFixed(2)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Color Identity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1">
            {Object.entries(stats.colorDistribution)
              .filter(([, count]) => count > 0)
              .map(([color]) => (
                <div
                  key={color}
                  className="h-6 w-6 rounded-full border border-border"
                  style={{
                    backgroundColor:
                      color === 'C'
                        ? '#CAC5C0'
                        : MTG_COLOR_MAP[color as MtgColor]?.hex || '#CAC5C0',
                  }}
                  title={
                    color === 'C'
                      ? 'Colorless'
                      : MTG_COLOR_MAP[color as MtgColor]?.name || color
                  }
                />
              ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Type Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {Object.entries(stats.typeDistribution)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 4)
              .map(([type, count]) => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {type}: {count}
                </Badge>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Mana Curve</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2" style={{ height: '96px' }}>
            {Object.entries(stats.manaCurve)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([cmc, count]) => {
                const barHeight = maxCurveValue > 0 ? (count / maxCurveValue) * 64 : 0;
                return (
                  <div key={cmc} className="flex flex-col items-center flex-1">
                    <div className="w-full flex items-end" style={{ height: '64px' }}>
                      <div
                        className="w-full bg-primary rounded-t transition-all"
                        style={{ height: `${barHeight}px`, minHeight: count > 0 ? '4px' : '0' }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{cmc === '7' ? '7+' : cmc}</div>
                    <div className="text-xs font-medium">{count}</div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
