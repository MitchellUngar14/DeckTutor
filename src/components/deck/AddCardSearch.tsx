'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDeckStore } from '@/stores/deckStore';
import { toast } from 'sonner';
import type { Card, DeckCard } from '@/types';

interface AddCardSearchProps {
  className?: string;
  onCardHover?: (card: Card | null) => void;
}

export function AddCardSearch({ className, onCardHover }: AddCardSearchProps) {
  const { currentDeck, addCard } = useDeckStore();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedCardName, setSelectedCardName] = useState<string | null>(null);
  const [showBoardSelect, setShowBoardSelect] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Get existing card names in the deck to show quantity hints
  const existingCards = useCallback(() => {
    if (!currentDeck) return new Map<string, number>();
    const cardMap = new Map<string, number>();

    const addToMap = (cards: { card: Card; quantity: number }[]) => {
      for (const dc of cards) {
        const current = cardMap.get(dc.card.name) || 0;
        cardMap.set(dc.card.name, current + dc.quantity);
      }
    };

    addToMap(currentDeck.mainboard);
    addToMap(currentDeck.sideboard);
    addToMap(currentDeck.maybeboard);

    return cardMap;
  }, [currentDeck]);

  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/cards/autocomplete?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length >= 2) {
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(query);
      }, 200);
    } else {
      setSuggestions([]);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, fetchSuggestions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAndAddCard = async (cardName: string, board: DeckCard['board']) => {
    setIsAddingCard(true);
    try {
      const response = await fetch(`/api/cards/${encodeURIComponent(cardName)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch card');
      }

      const card: Card = await response.json();
      addCard(card, board);

      const boardLabel = board === 'mainboard' ? 'mainboard' : board === 'sideboard' ? 'sideboard' : board;
      toast.success(`Added ${cardName} to ${boardLabel}`);

      // Reset state
      setQuery('');
      setSuggestions([]);
      setShowDropdown(false);
      setSelectedCardName(null);
      setShowBoardSelect(false);
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error adding card:', error);
      toast.error(`Failed to add ${cardName}`);
    } finally {
      setIsAddingCard(false);
    }
  };

  const handleSelect = (cardName: string) => {
    setSelectedCardName(cardName);
    setShowBoardSelect(true);
    setShowDropdown(false);
  };

  const handleAddToBoard = (board: DeckCard['board']) => {
    if (selectedCardName) {
      fetchAndAddCard(selectedCardName, board);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setHighlightedIndex(-1);
      setShowBoardSelect(false);
      setSelectedCardName(null);
    }
  };

  const cardQuantities = existingCards();

  return (
    <div className={cn('relative', className)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
              setHighlightedIndex(-1);
              setShowBoardSelect(false);
              setSelectedCardName(null);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search cards to add..."
            className="pl-9"
            disabled={isAddingCard}
          />

          {/* Suggestions Dropdown */}
          {showDropdown && (query.length >= 2 || suggestions.length > 0) && (
            <div
              ref={dropdownRef}
              className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto"
            >
              {isLoading ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  Searching...
                </div>
              ) : suggestions.length === 0 && query.length >= 2 ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  No cards found
                </div>
              ) : (
                suggestions.map((cardName, index) => {
                  const existingQty = cardQuantities.get(cardName);
                  return (
                    <button
                      key={cardName}
                      type="button"
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex justify-between items-center',
                        highlightedIndex === index && 'bg-accent'
                      )}
                      onClick={() => handleSelect(cardName)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      <span>{cardName}</span>
                      {existingQty && (
                        <span className="text-xs text-muted-foreground">
                          ({existingQty} in deck)
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Board Selection Dropdown */}
        {showBoardSelect && selectedCardName && (
          <DropdownMenu open={showBoardSelect} onOpenChange={setShowBoardSelect}>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm" disabled={isAddingCard}>
                {isAddingCard ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleAddToBoard('mainboard')}>
                Add to Mainboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddToBoard('sideboard')}>
                Add to Sideboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddToBoard('maybeboard')}>
                Add to Maybeboard
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Selected card indicator */}
      {selectedCardName && !isAddingCard && (
        <div className="mt-2 text-sm text-muted-foreground">
          Selected: <span className="font-medium text-foreground">{selectedCardName}</span>
          <span className="ml-2">— Choose where to add it</span>
        </div>
      )}
    </div>
  );
}
