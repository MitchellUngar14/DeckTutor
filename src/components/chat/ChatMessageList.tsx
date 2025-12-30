'use client';

import { useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { Loader2 } from 'lucide-react';
import type { ChatMessage as ChatMessageType, ParsedDeckSuggestion } from '@/types';

interface ChatMessageListProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  onSuggestedDeckDetected?: (deck: ParsedDeckSuggestion) => void;
  hasDeckContext?: boolean;
}

export function ChatMessageList({
  messages,
  isLoading,
  onSuggestedDeckDetected,
  hasDeckContext = false,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-2">
          <p className="text-lg">Start a conversation</p>
          <p className="text-sm">
            Ask about deck building, card choices, combos, or strategy
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
          onSuggestedDeckDetected={onSuggestedDeckDetected}
          hasDeckContext={hasDeckContext}
        />
      ))}

      {isLoading && (
        <div className="flex gap-3 p-4 bg-background">
          <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <span className="font-medium text-sm">AI Assistant</span>
            <div className="text-muted-foreground text-sm">Thinking...</div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
