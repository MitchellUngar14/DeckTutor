'use client';

import React from 'react';
import Image from 'next/image';

const SCRYFALL_SYMBOLS_URL = 'https://svgs.scryfall.io/card-symbols';

// Map of symbol codes to Scryfall SVG filenames
const SYMBOL_MAP: Record<string, string> = {
  'W': 'W.svg',
  'U': 'U.svg',
  'B': 'B.svg',
  'R': 'R.svg',
  'G': 'G.svg',
  'C': 'C.svg',
  'S': 'S.svg', // Snow
  'X': 'X.svg',
  'T': 'T.svg', // Tap
  'Q': 'Q.svg', // Untap
  'E': 'E.svg', // Energy
  '0': '0.svg',
  '1': '1.svg',
  '2': '2.svg',
  '3': '3.svg',
  '4': '4.svg',
  '5': '5.svg',
  '6': '6.svg',
  '7': '7.svg',
  '8': '8.svg',
  '9': '9.svg',
  '10': '10.svg',
  '11': '11.svg',
  '12': '12.svg',
  '13': '13.svg',
  '14': '14.svg',
  '15': '15.svg',
  '16': '16.svg',
  '20': '20.svg',
  // Hybrid mana
  'W/U': 'WU.svg',
  'W/B': 'WB.svg',
  'U/B': 'UB.svg',
  'U/R': 'UR.svg',
  'B/R': 'BR.svg',
  'B/G': 'BG.svg',
  'R/G': 'RG.svg',
  'R/W': 'RW.svg',
  'G/W': 'GW.svg',
  'G/U': 'GU.svg',
  // Phyrexian mana
  'W/P': 'WP.svg',
  'U/P': 'UP.svg',
  'B/P': 'BP.svg',
  'R/P': 'RP.svg',
  'G/P': 'GP.svg',
  // 2/color hybrid
  '2/W': '2W.svg',
  '2/U': '2U.svg',
  '2/B': '2B.svg',
  '2/R': '2R.svg',
  '2/G': '2G.svg',
};

interface ManaSymbolProps {
  symbol: string;
  size?: number;
}

export function ManaSymbol({ symbol, size = 16 }: ManaSymbolProps) {
  // Remove braces if present
  const cleanSymbol = symbol.replace(/[{}]/g, '').toUpperCase();
  const filename = SYMBOL_MAP[cleanSymbol];

  if (!filename) {
    // Return text fallback for unknown symbols
    return <span className="font-mono text-xs">{`{${cleanSymbol}}`}</span>;
  }

  return (
    <Image
      src={`${SCRYFALL_SYMBOLS_URL}/${filename}`}
      alt={cleanSymbol}
      width={size}
      height={size}
      className="inline-block align-middle"
      unoptimized // External URL
    />
  );
}

interface ManaTextProps {
  text: string;
  symbolSize?: number;
  className?: string;
}

export function ManaText({ text, symbolSize = 14, className = '' }: ManaTextProps) {
  // Parse text and replace {X} patterns with ManaSymbol components
  const parts: React.ReactNode[] = [];
  const regex = /\{([^}]+)\}/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the symbol
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Add the symbol
    parts.push(
      <ManaSymbol key={key++} symbol={match[1]} size={symbolSize} />
    );

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <span className={className}>{parts}</span>;
}
