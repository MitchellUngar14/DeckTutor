'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDeckStore } from '@/stores/deckStore';
import { toast } from 'sonner';

export function DeckImporter() {
  const [url, setUrl] = useState('');
  const router = useRouter();
  const { setImportState, setCurrentDeck } = useDeckStore();

  const handleImport = async () => {
    if (!url.trim()) {
      toast.error('Please enter a Moxfield deck URL');
      return;
    }

    setImportState({
      isImporting: true,
      importProgress: 0,
      importStage: 'parsing',
    });

    try {
      setImportState({ importStage: 'fetching', importProgress: 20 });

      const response = await fetch('/api/decks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moxfieldUrl: url }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to import deck');
      }

      setImportState({ importStage: 'loading-cards', importProgress: 60 });

      const data = await response.json();

      setImportState({ importStage: 'ready', importProgress: 100 });
      setCurrentDeck(data.deck);

      toast.success(`Imported "${data.deck.name}" successfully!`);
      router.push(`/deck/${data.deck.id}`);
    } catch (error) {
      setImportState({ importStage: 'error', isImporting: false });
      toast.error(error instanceof Error ? error.message : 'Failed to import deck');
    }
  };

  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Import from Moxfield</CardTitle>
        <CardDescription>
          Paste a Moxfield deck URL to import your deck and analyze it for combos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="https://www.moxfield.com/decks/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleImport()}
          />
          <Button onClick={handleImport}>Import</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Make sure your deck is set to public on Moxfield.
        </p>
      </CardContent>
    </Card>
  );
}
