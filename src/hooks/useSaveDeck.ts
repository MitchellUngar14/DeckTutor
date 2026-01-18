'use client';

import { useState, useMemo, useCallback } from 'react';
import { useDeckStore } from '@/stores/deckStore';
import { computeDeckChanges, type DeckChanges } from '@/components/deck/DeckChangesDialog';
import { toast } from 'sonner';

export interface UseSaveDeckResult {
  // State
  saving: boolean;
  showChangesDialog: boolean;
  changes: DeckChanges;
  hasChanges: boolean;
  hasAdditions: boolean;
  hasRemovals: boolean;
  savedDeckId: string | null;

  // Actions
  handleSaveClick: () => Promise<void>;
  performSave: () => Promise<void>;
  undoChanges: () => void;
  setShowChangesDialog: (show: boolean) => void;

  // Helpers
  getButtonText: () => string;
}

export function useSaveDeck(): UseSaveDeckResult {
  const {
    currentDeck,
    savedDeckSnapshot,
    savedDeckId,
    setCurrentDeck,
    markDeckAsSaved,
    setSavedDeckId,
  } = useDeckStore();

  const [saving, setSaving] = useState(false);
  const [showChangesDialog, setShowChangesDialog] = useState(false);

  // Compute changes between current deck and saved snapshot
  const changes = useMemo(() => {
    return computeDeckChanges(currentDeck, savedDeckSnapshot);
  }, [currentDeck, savedDeckSnapshot]);

  const hasChanges = changes.additions.length > 0 || changes.removals.length > 0;
  const hasAdditions = changes.additions.length > 0;
  const hasRemovals = changes.removals.length > 0;

  const performSave = useCallback(async () => {
    if (!currentDeck) return;

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

      const requestBody = {
        name: currentDeck.name,
        description: currentDeck.description,
        format: currentDeck.format,
        moxfieldId: currentDeck.moxfieldId,
        commanderIds: currentDeck.commanders.map((c) => c.id),
        deckData,
      };

      let response: Response;

      if (savedDeckId) {
        // Update existing deck
        response = await fetch(`/api/user/decks/${savedDeckId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        });
      } else {
        // Create new deck
        response = await fetch('/api/user/decks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        });
      }

      if (response.ok) {
        const data = await response.json();
        // Update the saved state
        if (!savedDeckId && data.deck?.id) {
          setSavedDeckId(data.deck.id);
        }
        markDeckAsSaved();
        toast.success('Deck saved to your collection');
        setShowChangesDialog(false);
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
  }, [currentDeck, savedDeckId, markDeckAsSaved, setSavedDeckId]);

  const handleSaveClick = useCallback(async () => {
    // Case 1: Deck hasn't been saved yet (new import) - save directly
    if (!savedDeckId) {
      await performSave();
      return;
    }

    // Case 2: No changes to save
    if (!hasChanges) {
      toast.info('No changes to save');
      return;
    }

    // Case 3: Has any changes - show confirmation dialog
    setShowChangesDialog(true);
  }, [savedDeckId, hasChanges, performSave]);

  const getButtonText = useCallback(() => {
    if (saving) return 'Saving...';
    if (!savedDeckId) return 'Save Deck';
    if (!hasChanges) return 'Saved';
    return 'Save Changes';
  }, [saving, savedDeckId, hasChanges]);

  const undoChanges = useCallback(() => {
    if (savedDeckSnapshot) {
      // Revert to the saved snapshot
      setCurrentDeck(JSON.parse(JSON.stringify(savedDeckSnapshot)));
      toast.success('Changes undone');
    }
  }, [savedDeckSnapshot, setCurrentDeck]);

  return {
    saving,
    showChangesDialog,
    changes,
    hasChanges,
    hasAdditions,
    hasRemovals,
    savedDeckId,
    handleSaveClick,
    performSave,
    undoChanges,
    setShowChangesDialog,
    getButtonText,
  };
}
