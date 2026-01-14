'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CardAutocompleteProps {
  selectedCards: string[];
  onCardAdd: (cardName: string) => void;
  onCardRemove: (cardName: string) => void;
  onCardHover?: (cardName: string | null) => void;
  placeholder?: string;
  className?: string;
}

export function CardAutocomplete({
  selectedCards,
  onCardAdd,
  onCardRemove,
  onCardHover,
  placeholder = 'Search for cards...',
  className,
}: CardAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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
        // Filter out already selected cards
        const filtered = (data.suggestions || []).filter(
          (name: string) => !selectedCards.includes(name)
        );
        setSuggestions(filtered);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCards]);

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

  const handleSelect = (cardName: string) => {
    onCardAdd(cardName);
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
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
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-9"
        />

        {/* Dropdown */}
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
              suggestions.map((cardName, index) => (
                <button
                  key={cardName}
                  type="button"
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors',
                    highlightedIndex === index && 'bg-accent'
                  )}
                  onClick={() => handleSelect(cardName)}
                  onMouseEnter={() => {
                    setHighlightedIndex(index);
                    onCardHover?.(cardName);
                  }}
                  onMouseLeave={() => onCardHover?.(null)}
                >
                  {cardName}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected Cards */}
      {selectedCards.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCards.map((cardName) => (
            <Badge
              key={cardName}
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80 transition-colors pr-1"
              onMouseEnter={() => onCardHover?.(cardName)}
              onMouseLeave={() => onCardHover?.(null)}
            >
              <span className="mr-1">{cardName}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCardRemove(cardName);
                }}
                className="ml-1 hover:bg-destructive/20 rounded p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
