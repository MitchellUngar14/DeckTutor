'use client';

import { useState } from 'react';
import { Copy, Check, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Deck } from '@/types';

interface ExportDeckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deck: Deck;
}

function generateDeckList(deck: Deck): string {
  const lines: string[] = [];

  // Collect all mainboard cards with quantities
  const mainboardCards = deck.mainboard
    .map((dc) => ({ name: dc.card.name, quantity: dc.quantity }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Add mainboard cards
  for (const card of mainboardCards) {
    lines.push(`${card.quantity} ${card.name}`);
  }

  // Add sideboard if present
  if (deck.sideboard.length > 0) {
    lines.push('');
    lines.push('SIDEBOARD:');
    const sideboardCards = deck.sideboard
      .map((dc) => ({ name: dc.card.name, quantity: dc.quantity }))
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const card of sideboardCards) {
      lines.push(`${card.quantity} ${card.name}`);
    }
  }

  // Add commanders at the end (separated by blank line)
  if (deck.commanders.length > 0) {
    lines.push('');
    for (const commander of deck.commanders) {
      lines.push(`1 ${commander.name}`);
    }
  }

  return lines.join('\n');
}

export function ExportDeckModal({ open, onOpenChange, deck }: ExportDeckModalProps) {
  const [copied, setCopied] = useState(false);

  const deckList = generateDeckList(deck);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(deckList);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([deckList], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deck.name.replace(/[^a-z0-9]/gi, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalCards =
    deck.commanders.length +
    deck.mainboard.reduce((sum, dc) => sum + dc.quantity, 0) +
    deck.sideboard.reduce((sum, dc) => sum + dc.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Export Deck</DialogTitle>
          <DialogDescription>
            {deck.name} • {totalCards} cards
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/50 overflow-y-auto max-h-[50vh]">
          <pre className="text-sm font-mono whitespace-pre-wrap p-4">{deckList}</pre>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy to Clipboard
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
