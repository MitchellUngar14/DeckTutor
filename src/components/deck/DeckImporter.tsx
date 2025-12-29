'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDeckStore } from '@/stores/deckStore';
import { toast } from 'sonner';

export function DeckImporter() {
  const [url, setUrl] = useState('');
  const [deckName, setDeckName] = useState('');
  const [deckText, setDeckText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { setImportState, setCurrentDeck } = useDeckStore();

  const handleUrlImport = async () => {
    if (!url.trim()) {
      toast.error('Please enter a Moxfield deck URL');
      return;
    }

    setIsLoading(true);
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

      // Show appropriate toast based on warnings/info
      if (data.warnings && data.warnings.length > 0) {
        toast.warning(data.warnings[0]);
      } else if (data.info && data.info.length > 0) {
        toast.success(`Imported "${data.deck.name}" successfully!`);
        toast.info(data.info[0]);
      } else {
        toast.success(`Imported "${data.deck.name}" successfully!`);
      }
      router.push(`/deck/${data.deck.id}`);
    } catch (error) {
      setImportState({ importStage: 'error', isImporting: false });
      toast.error(error instanceof Error ? error.message : 'Failed to import deck');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextImport = async () => {
    if (!deckText.trim()) {
      toast.error('Please paste your deck list');
      return;
    }

    setIsLoading(true);
    setImportState({
      isImporting: true,
      importProgress: 0,
      importStage: 'parsing',
    });

    try {
      setImportState({ importStage: 'loading-cards', importProgress: 30 });

      const response = await fetch('/api/decks/import-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckText,
          deckName: deckName.trim() || 'Imported Deck',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to import deck');
      }

      const data = await response.json();

      setImportState({ importStage: 'ready', importProgress: 100 });
      setCurrentDeck(data.deck);

      // Show appropriate toast based on warnings/info
      if (data.warnings && data.warnings.length > 0) {
        toast.warning(data.warnings[0]);
      } else if (data.info && data.info.length > 0) {
        toast.success(`Imported "${data.deck.name}" successfully!`);
        toast.info(data.info[0]);
      } else {
        toast.success(`Imported "${data.deck.name}" successfully!`);
      }
      router.push(`/deck/${data.deck.id}`);
    } catch (error) {
      setImportState({ importStage: 'error', isImporting: false });
      toast.error(error instanceof Error ? error.message : 'Failed to import deck');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Import Commander Deck</CardTitle>
        <CardDescription>
          Paste your Commander deck list to import and analyze it for combos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="text" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text">Paste Deck List</TabsTrigger>
            <TabsTrigger value="url">Moxfield URL</TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Deck name (optional)"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
              />
              <textarea
                className="w-full min-h-[200px] p-3 rounded-md border border-input bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={`Paste your Commander deck list here...

Example (Moxfield text export):
1 Sol Ring
1 Command Tower
1 Thassa's Oracle
35 Island

1 Your Commander`}
                value={deckText}
                onChange={(e) => setDeckText(e.target.value)}
              />
            </div>
            <Button onClick={handleTextImport} disabled={isLoading} className="w-full">
              {isLoading ? 'Importing...' : 'Import Deck'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Export from Moxfield: Click the three dots → &quot;Export&quot; → &quot;Text&quot;.
              The commander will be detected automatically (it&apos;s after the blank line).
            </p>
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
              <div className="text-4xl">🚧</div>
              <h3 className="text-lg font-semibold">Under Construction</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Direct Moxfield URL import is temporarily unavailable while we work on API access.
                Please use the &quot;Paste Deck List&quot; option instead.
              </p>
              <p className="text-xs text-muted-foreground">
                Export from Moxfield: Click the three dots → &quot;Export&quot; → &quot;Text&quot;
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
