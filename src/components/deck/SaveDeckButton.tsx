'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDeckStore } from '@/stores/deckStore';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function SaveDeckButton() {
  const { user } = useAuth();
  const { currentDeck } = useDeckStore();
  const [saving, setSaving] = useState(false);

  if (!user || !currentDeck) {
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('decktutor-token');

      // Store the full deck data as JSON for reliable retrieval
      const deckData = {
        commanders: currentDeck.commanders,
        mainboard: currentDeck.mainboard,
        sideboard: currentDeck.sideboard,
        maybeboard: currentDeck.maybeboard,
        moxfieldUrl: currentDeck.moxfieldUrl,
      };

      const response = await fetch('/api/user/decks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: currentDeck.name,
          description: currentDeck.description,
          format: currentDeck.format,
          moxfieldId: currentDeck.moxfieldId,
          commanderIds: currentDeck.commanders.map((c) => c.id),
          deckData,
        }),
      });

      if (response.ok) {
        toast.success('Deck saved to your collection');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to save deck');
      }
    } catch (error) {
      console.error('Error saving deck:', error);
      toast.error('Failed to save deck');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
      {saving ? 'Saving...' : 'Save Deck'}
    </Button>
  );
}
