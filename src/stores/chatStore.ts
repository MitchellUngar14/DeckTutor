import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type {
  ChatMessage,
  ChatConversation,
  ChatSettings,
  CommanderBracket,
  ParsedDeckSuggestion,
} from '@/types';

interface ChatState {
  // Conversations keyed by deckId (null key = standalone)
  conversations: Record<string, ChatConversation>;

  // Current session
  currentDeckId: string | null;
  isLoading: boolean;
  error: string | null;

  // Suggested deck from AI (for comparison feature)
  suggestedDeck: ParsedDeckSuggestion | null;

  // Settings
  settings: ChatSettings;

  // Actions
  setCurrentDeckId: (deckId: string | null) => void;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearConversation: (deckId?: string | null) => void;
  setSettings: (settings: Partial<ChatSettings>) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSuggestedDeck: (deck: ParsedDeckSuggestion | null) => void;

  // Selectors
  getCurrentConversation: () => ChatConversation | null;
  getConversationByDeckId: (deckId: string | null) => ChatConversation | null;
}

const getConversationKey = (deckId: string | null): string =>
  deckId || '__standalone__';

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: {},
      currentDeckId: null,
      isLoading: false,
      error: null,
      suggestedDeck: null,

      settings: {
        provider: 'openai' as const,
        model: 'gpt-4o-mini' as const,
        bracketLevel: 2 as CommanderBracket,
        includeContext: true,
      },

      setCurrentDeckId: (deckId) => set({ currentDeckId: deckId }),

      addMessage: (message) => {
        const { currentDeckId, conversations } = get();
        const key = getConversationKey(currentDeckId);
        const now = new Date().toISOString();

        const existingConvo = conversations[key];
        const newMessage: ChatMessage = {
          ...message,
          id: nanoid(),
          timestamp: now,
        };

        const updatedConvo: ChatConversation = existingConvo
          ? {
              ...existingConvo,
              messages: [...existingConvo.messages, newMessage],
              updatedAt: now,
            }
          : {
              id: nanoid(),
              deckId: currentDeckId,
              messages: [newMessage],
              createdAt: now,
              updatedAt: now,
            };

        set({
          conversations: {
            ...conversations,
            [key]: updatedConvo,
          },
        });
      },

      clearConversation: (deckId) => {
        const { currentDeckId, conversations } = get();
        const key = getConversationKey(deckId ?? currentDeckId);
        const { [key]: _, ...rest } = conversations;
        set({ conversations: rest, suggestedDeck: null });
      },

      setSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      setIsLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      setSuggestedDeck: (deck) => set({ suggestedDeck: deck }),

      getCurrentConversation: () => {
        const { currentDeckId, conversations } = get();
        const key = getConversationKey(currentDeckId);
        return conversations[key] || null;
      },

      getConversationByDeckId: (deckId) => {
        const { conversations } = get();
        const key = getConversationKey(deckId);
        return conversations[key] || null;
      },
    }),
    {
      name: 'decktutor-chat-storage',
      partialize: (state) => ({
        conversations: state.conversations,
        settings: state.settings,
        suggestedDeck: state.suggestedDeck,
      }),
    }
  )
);
