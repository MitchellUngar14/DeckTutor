'use client';

import { useMemo } from 'react';
import { User, Bot, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { ManaText } from '@/components/ui/mana-symbol';
import type { ChatMessage as ChatMessageType, ParsedDeckSuggestion } from '@/types';

interface ChatMessageProps {
  message: ChatMessageType;
  onSuggestedDeckDetected?: (deck: ParsedDeckSuggestion) => void;
  hasDeckContext?: boolean;
}

// Parse [SUGGESTED_DECK]...[/SUGGESTED_DECK] blocks from AI response
function parseDeckSuggestion(content: string): ParsedDeckSuggestion | null {
  // Try to find the deck block - it might be inside a code block or plain text
  // First, try to extract from code blocks
  const codeBlockMatch = content.match(/```[\s\S]*?\[SUGGESTED_DECK\]([\s\S]*?)\[\/SUGGESTED_DECK\][\s\S]*?```/);
  // Then try plain text
  const plainMatch = content.match(/\[SUGGESTED_DECK\]([\s\S]*?)\[\/SUGGESTED_DECK\]/);

  const match = codeBlockMatch || plainMatch;
  if (!match) return null;

  const deckText = match[1].trim();
  const lines = deckText.split('\n');

  const commanders: Array<{ name: string; quantity: number }> = [];
  const mainboard: Array<{ name: string; quantity: number }> = [];
  const sideboard: Array<{ name: string; quantity: number }> = [];

  let currentSection: 'commanders' | 'mainboard' | 'sideboard' = 'mainboard';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) {
      // Check for section headers
      const lowerLine = trimmed.toLowerCase();
      if (lowerLine.includes('commander')) {
        currentSection = 'commanders';
      } else if (lowerLine.includes('sideboard')) {
        currentSection = 'sideboard';
      } else if (lowerLine.includes('mainboard') || lowerLine.includes('main')) {
        currentSection = 'mainboard';
      }
      continue;
    }

    // Parse card line: "1 Card Name" or "1x Card Name"
    const cardMatch = trimmed.match(/^(\d+)x?\s+(.+)$/i);
    if (cardMatch) {
      const quantity = parseInt(cardMatch[1], 10);
      const name = cardMatch[2].trim();

      const card = { name, quantity };

      switch (currentSection) {
        case 'commanders':
          commanders.push(card);
          break;
        case 'sideboard':
          sideboard.push(card);
          break;
        default:
          mainboard.push(card);
      }
    }
  }

  if (commanders.length === 0 && mainboard.length === 0) {
    return null;
  }

  return {
    commanders,
    mainboard,
    sideboard,
    rawText: deckText,
  };
}

export function ChatMessage({ message, onSuggestedDeckDetected, hasDeckContext = false }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [deckCopied, setDeckCopied] = useState(false);
  const isUser = message.role === 'user';

  // Check for deck suggestion in assistant messages
  const suggestedDeck = useMemo(() => {
    if (isUser) return null;
    return parseDeckSuggestion(message.content);
  }, [message.content, isUser]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Copy deck list in importable format (Moxfield compatible)
  // Moxfield format: Mainboard first, then Sideboard, then Commander at the end
  const handleCopyDeckList = async () => {
    if (!suggestedDeck) return;

    const lines: string[] = [];

    // Add mainboard first (Moxfield expects this order)
    for (const card of suggestedDeck.mainboard) {
      lines.push(`${card.quantity} ${card.name}`);
    }

    // Add sideboard if present
    if (suggestedDeck.sideboard.length > 0) {
      lines.push('');
      lines.push('Sideboard');
      for (const card of suggestedDeck.sideboard) {
        lines.push(`${card.quantity} ${card.name}`);
      }
    }

    // Add commanders at the end with *CMDR* tag (Moxfield format)
    if (suggestedDeck.commanders.length > 0) {
      lines.push('');
      for (const card of suggestedDeck.commanders) {
        lines.push(`${card.quantity} ${card.name} *CMDR*`);
      }
    }

    await navigator.clipboard.writeText(lines.join('\n'));
    setDeckCopied(true);
    setTimeout(() => setDeckCopied(false), 2000);
  };

  const handleViewDeck = () => {
    if (suggestedDeck && onSuggestedDeckDetected) {
      onSuggestedDeckDetected(suggestedDeck);
    }
  };

  return (
    <div
      className={`flex gap-3 p-4 ${
        isUser ? 'bg-muted/50' : 'bg-background'
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {isUser ? 'You' : 'AI Assistant'}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-pre:my-2 prose-code:before:content-none prose-code:after:content-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Custom paragraph to render mana symbols
              p: ({ children }) => (
                <p>
                  {typeof children === 'string' ? (
                    <ManaText text={children} />
                  ) : (
                    children
                  )}
                </p>
              ),
              // Custom list item to render mana symbols
              li: ({ children }) => (
                <li>
                  {typeof children === 'string' ? (
                    <ManaText text={children} />
                  ) : (
                    children
                  )}
                </li>
              ),
              // Custom inline code styling
              code: ({ className, children, ...props }) => {
                const isInline = !className;
                if (isInline) {
                  return (
                    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                      {children}
                    </code>
                  );
                }
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              // Custom code block styling
              pre: ({ children }) => (
                <pre className="bg-muted rounded-md p-3 overflow-x-auto text-sm">
                  {children}
                </pre>
              ),
              // Custom link styling
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {children}
                </a>
              ),
              // Custom table styling
              table: ({ children }) => (
                <div className="overflow-x-auto my-2">
                  <table className="border-collapse border border-border w-full">
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-border px-3 py-2 bg-muted font-semibold text-left">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-border px-3 py-2">
                  {typeof children === 'string' ? (
                    <ManaText text={children} />
                  ) : (
                    children
                  )}
                </td>
              ),
              // Custom blockquote styling
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-primary/50 pl-4 italic text-muted-foreground my-2">
                  {children}
                </blockquote>
              ),
              // Custom horizontal rule
              hr: () => <hr className="border-border my-4" />,
              // Strong text with mana symbol support
              strong: ({ children }) => (
                <strong className="font-semibold">
                  {typeof children === 'string' ? (
                    <ManaText text={children} />
                  ) : (
                    children
                  )}
                </strong>
              ),
              // Emphasis with mana symbol support
              em: ({ children }) => (
                <em>
                  {typeof children === 'string' ? (
                    <ManaText text={children} />
                  ) : (
                    children
                  )}
                </em>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-2">
          {!isUser && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          )}

          {suggestedDeck && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleCopyDeckList}
            >
              {deckCopied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Deck Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy Deck List
                </>
              )}
            </Button>
          )}
          {suggestedDeck && hasDeckContext && (
            <Button
              variant="default"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleViewDeck}
            >
              Compare Deck Suggestion
            </Button>
          )}
          {suggestedDeck && !hasDeckContext && (
            <span className="text-xs text-muted-foreground italic">
              Import a deck to compare suggestions
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
