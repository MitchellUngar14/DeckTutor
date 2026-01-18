'use client';

import { useAuth } from '@/context/AuthContext';
import { useDeckStore } from '@/stores/deckStore';
import { Button } from '@/components/ui/button';
import { DeckChangesDialog } from './DeckChangesDialog';
import { useSaveDeck } from '@/hooks/useSaveDeck';

export function SaveDeckButton() {
  const { user } = useAuth();
  const { currentDeck } = useDeckStore();
  const {
    saving,
    showChangesDialog,
    changes,
    hasChanges,
    handleSaveClick,
    performSave,
    undoChanges,
    setShowChangesDialog,
    getButtonText,
  } = useSaveDeck();

  if (!user || !currentDeck) {
    return null;
  }

  return (
    <>
      <Button
        variant={hasChanges ? 'default' : 'outline'}
        size="sm"
        onClick={handleSaveClick}
        disabled={saving}
      >
        {getButtonText()}
      </Button>

      <DeckChangesDialog
        open={showChangesDialog}
        onOpenChange={setShowChangesDialog}
        changes={changes}
        onConfirm={performSave}
        onUndo={undoChanges}
        isLoading={saving}
      />
    </>
  );
}
