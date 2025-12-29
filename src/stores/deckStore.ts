import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Card, Deck, DeckCard } from '@/types';

export type ViewMode = 'grid' | 'list' | 'visual';
export type SortBy = 'name' | 'cmc' | 'type' | 'color';
export type GroupBy = 'type' | 'cmc' | 'color' | 'none';

interface DeckState {
  // Current working deck
  currentDeck: Deck | null;

  // UI state
  viewMode: ViewMode;
  sortBy: SortBy;
  groupBy: GroupBy;

  // Card preview
  hoveredCard: Card | null;
  selectedCard: Card | null;

  // Import state
  isImporting: boolean;
  importProgress: number;
  importStage: 'idle' | 'parsing' | 'fetching' | 'loading-cards' | 'ready' | 'error';

  // Actions
  setCurrentDeck: (deck: Deck | null) => void;
  updateCardQuantity: (cardId: string, board: DeckCard['board'], quantity: number) => void;
  removeCard: (cardId: string, board: DeckCard['board']) => void;
  addCard: (card: Card, board: DeckCard['board']) => void;
  setViewMode: (mode: ViewMode) => void;
  setSortBy: (sort: SortBy) => void;
  setGroupBy: (group: GroupBy) => void;
  setHoveredCard: (card: Card | null) => void;
  setSelectedCard: (card: Card | null) => void;
  setImportState: (state: Partial<Pick<DeckState, 'isImporting' | 'importProgress' | 'importStage'>>) => void;
  clearDeck: () => void;
}

export const useDeckStore = create<DeckState>()(
  persist(
    (set, get) => ({
      currentDeck: null,
      viewMode: 'grid',
      sortBy: 'name',
      groupBy: 'type',
      hoveredCard: null,
      selectedCard: null,
      isImporting: false,
      importProgress: 0,
      importStage: 'idle',

      setCurrentDeck: (deck) => set({ currentDeck: deck }),

      updateCardQuantity: (cardId, board, quantity) => {
        const { currentDeck } = get();
        if (!currentDeck) return;

        const boardKey = board === 'commanders' ? 'mainboard' : board;
        const updatedBoard = currentDeck[boardKey].map((dc) =>
          dc.card.id === cardId && dc.board === board
            ? { ...dc, quantity }
            : dc
        );

        set({
          currentDeck: {
            ...currentDeck,
            [boardKey]: updatedBoard,
            lastModifiedAt: new Date().toISOString(),
          },
        });
      },

      removeCard: (cardId, board) => {
        const { currentDeck } = get();
        if (!currentDeck) return;

        const boardKey = board === 'commanders' ? 'mainboard' : board;
        const updatedBoard = currentDeck[boardKey].filter(
          (dc) => !(dc.card.id === cardId && dc.board === board)
        );

        set({
          currentDeck: {
            ...currentDeck,
            [boardKey]: updatedBoard,
            lastModifiedAt: new Date().toISOString(),
          },
        });
      },

      addCard: (card, board) => {
        const { currentDeck } = get();
        if (!currentDeck) return;

        const boardKey = board === 'commanders' ? 'mainboard' : board;
        const existingIndex = currentDeck[boardKey].findIndex(
          (dc) => dc.card.id === card.id && dc.board === board
        );

        let updatedBoard;
        if (existingIndex >= 0) {
          updatedBoard = currentDeck[boardKey].map((dc, i) =>
            i === existingIndex ? { ...dc, quantity: dc.quantity + 1 } : dc
          );
        } else {
          updatedBoard = [
            ...currentDeck[boardKey],
            { card, quantity: 1, board },
          ];
        }

        set({
          currentDeck: {
            ...currentDeck,
            [boardKey]: updatedBoard,
            lastModifiedAt: new Date().toISOString(),
          },
        });
      },

      setViewMode: (viewMode) => set({ viewMode }),
      setSortBy: (sortBy) => set({ sortBy }),
      setGroupBy: (groupBy) => set({ groupBy }),
      setHoveredCard: (hoveredCard) => set({ hoveredCard }),
      setSelectedCard: (selectedCard) => set({ selectedCard }),

      setImportState: (state) => set(state),

      clearDeck: () =>
        set({
          currentDeck: null,
          hoveredCard: null,
          selectedCard: null,
          importStage: 'idle',
          importProgress: 0,
        }),
    }),
    {
      name: 'decktutor-storage',
      partialize: (state) => ({
        viewMode: state.viewMode,
        sortBy: state.sortBy,
        groupBy: state.groupBy,
        // Don't persist current deck in localStorage for now
      }),
    }
  )
);
