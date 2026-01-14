'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { ChatSettings } from './ChatSettings';
import { DeckContextPreview } from './DeckContextPreview';
import { useChatStore } from '@/stores/chatStore';
import type { DeckContext, ChatRequest, ChatResponse, ParsedDeckSuggestion } from '@/types';

interface ChatContainerProps {
  deckContext?: DeckContext | null;
  deckId?: string | null;
}

export function ChatContainer({ deckContext, deckId }: ChatContainerProps) {
  const router = useRouter();

  const {
    setCurrentDeckId,
    getCurrentConversation,
    addMessage,
    clearConversation,
    settings,
    setSettings,
    isLoading,
    setIsLoading,
    error,
    setError,
    setSuggestedDeck,
  } = useChatStore();

  // Set current deck ID on mount
  useEffect(() => {
    setCurrentDeckId(deckId || null);
  }, [deckId, setCurrentDeckId]);

  const conversation = getCurrentConversation();
  const messages = conversation?.messages || [];

  const handleSend = useCallback(
    async (messageContent: string) => {
      // Clear any previous error
      setError(null);

      // Add user message
      addMessage({
        role: 'user',
        content: messageContent,
      });

      setIsLoading(true);

      try {
        // Build request
        const request: ChatRequest = {
          message: messageContent,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          deckContext: settings.includeContext ? deckContext : null,
          settings,
        };

        // Call API with auth token
        const token = typeof window !== 'undefined' ? localStorage.getItem('decktutor-token') : null;
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to get response');
        }

        const data: ChatResponse = await response.json();

        // Add assistant message
        addMessage({
          role: 'assistant',
          content: data.message,
        });
      } catch (err) {
        console.error('Chat error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');

        // Add error message to chat
        addMessage({
          role: 'assistant',
          content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [messages, deckContext, settings, addMessage, setIsLoading, setError]
  );

  const handleClearConversation = useCallback(() => {
    clearConversation();
    setSuggestedDeck(null);
  }, [clearConversation, setSuggestedDeck]);

  const handleSuggestedDeckDetected = useCallback(
    (deck: ParsedDeckSuggestion) => {
      setSuggestedDeck(deck);
      // Navigate to comparison page if we have a deck context
      if (deckId) {
        router.push(`/deck/${deckId}/compare`);
      }
    },
    [deckId, router, setSuggestedDeck]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Settings bar */}
      <ChatSettings
        settings={settings}
        onSettingsChange={setSettings}
        onClearConversation={handleClearConversation}
        hasDeckContext={!!deckContext}
      />

      {/* Deck context preview (if available and enabled) */}
      {deckContext && settings.includeContext && (
        <DeckContextPreview deckContext={deckContext} />
      )}

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Messages */}
      <ChatMessageList
        messages={messages}
        isLoading={isLoading}
        onSuggestedDeckDetected={deckId ? handleSuggestedDeckDetected : undefined}
        hasDeckContext={!!deckId}
      />

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
}
