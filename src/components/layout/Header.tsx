'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDeckStore, type ViewMode, type SortBy, type GroupBy } from '@/stores/deckStore';
import { useAuth } from '@/context/AuthContext';
import { SaveDeckButton } from '@/components/deck/SaveDeckButton';
import { DeckChangesDialog } from '@/components/deck/DeckChangesDialog';
import { useSaveDeck } from '@/hooks/useSaveDeck';

export function Header() {
  const pathname = usePathname();
  const { currentDeck, viewMode, setViewMode, sortBy, setSortBy, groupBy, setGroupBy } = useDeckStore();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { user, loading: authLoading, signout } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Use the save deck hook for mobile save functionality
  const {
    saving: mobileSaving,
    showChangesDialog,
    changes,
    hasChanges,
    handleSaveClick: handleMobileSaveClick,
    performSave,
    undoChanges,
    setShowChangesDialog,
    getButtonText,
  } = useSaveDeck();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDeckPage = pathname?.startsWith('/deck/') && !pathname?.includes('/import');
  const showDeckActions = isDeckPage && currentDeck;

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const handleMobileSave = async () => {
    setMobileMenuOpen(false);
    await handleMobileSaveClick();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Image src="/logo.png" alt="DeckTutor" width={36} height={36} />
            <span className="text-xl font-bold">DeckTutor</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex flex-1 items-center justify-end space-x-2">
          {showDeckActions && (
            <>
              {user && <SaveDeckButton />}
              <Button variant="outline" size="sm" asChild>
                <Link href={`/deck/${currentDeck.id}/chat`}>Ask AI</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/deck/${currentDeck.id}/combos`}>Check Combos</Link>
              </Button>
              {currentDeck.moxfieldUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={currentDeck.moxfieldUrl} target="_blank" rel="noopener noreferrer">
                    View on Moxfield
                  </a>
                </Button>
              )}
              <Sheet open={showSettings} onOpenChange={setShowSettings}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">Settings</Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>View Settings</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">View Mode</label>
                      <div className="flex gap-2">
                        {(['grid', 'list', 'visual'] as ViewMode[]).map((mode) => (
                          <Button
                            key={mode}
                            variant={viewMode === mode ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setViewMode(mode)}
                          >
                            {mode.charAt(0).toUpperCase() + mode.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Sort By</label>
                      <div className="flex flex-wrap gap-2">
                        {(['name', 'cmc', 'type', 'color', 'cost'] as SortBy[]).map((sort) => (
                          <Button
                            key={sort}
                            variant={sortBy === sort ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSortBy(sort)}
                          >
                            {sort.toUpperCase()}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Group By</label>
                      <div className="flex flex-wrap gap-2">
                        {(['type', 'cmc', 'color', 'none'] as GroupBy[]).map((group) => (
                          <Button
                            key={group}
                            variant={groupBy === group ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setGroupBy(group)}
                          >
                            {group === 'none' ? 'None' : group.toUpperCase()}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href="/deck/import">Import Deck</Link>
          </Button>
          {/* Auth UI */}
          {mounted && !authLoading && (
            user ? (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/decks">Saved Decks</Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      {user.displayName}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href="/decks">Saved Decks</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signout}>
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
                <Button variant="default" size="sm" asChild>
                  <Link href="/auth/signup">Sign Up</Link>
                </Button>
              </>
            )
          )}
          {mounted && (
            <Button variant="ghost" size="sm" onClick={toggleTheme} className="px-2">
              {resolvedTheme === 'dark' ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2" />
                  <path d="M12 20v2" />
                  <path d="m4.93 4.93 1.41 1.41" />
                  <path d="m17.66 17.66 1.41 1.41" />
                  <path d="M2 12h2" />
                  <path d="M20 12h2" />
                  <path d="m6.34 17.66-1.41 1.41" />
                  <path d="m19.07 4.93-1.41 1.41" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              )}
            </Button>
          )}
        </div>

        {/* Mobile Hamburger Menu */}
        <div className="flex md:hidden flex-1 items-center justify-end">
          <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="px-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="4" x2="20" y1="12" y2="12" />
                  <line x1="4" x2="20" y1="6" y2="6" />
                  <line x1="4" x2="20" y1="18" y2="18" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/deck/import" onClick={() => setMobileMenuOpen(false)}>
                  Import Deck
                </Link>
              </DropdownMenuItem>
              {mounted && (
                <DropdownMenuItem onClick={() => { setMobileMenuOpen(false); toggleTheme(); }}>
                  {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {mounted && !authLoading && (
                user ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/decks" onClick={() => setMobileMenuOpen(false)}>
                        Saved Decks
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setMobileMenuOpen(false); signout(); }}>
                      Sign Out ({user.displayName})
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/auth/signin" onClick={() => setMobileMenuOpen(false)}>
                        Sign In
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/auth/signup" onClick={() => setMobileMenuOpen(false)}>
                        Sign Up
                      </Link>
                    </DropdownMenuItem>
                  </>
                )
              )}
              {showDeckActions && (
                <>
                  <DropdownMenuSeparator />
                  {user && (
                    <DropdownMenuItem onClick={handleMobileSave} disabled={mobileSaving}>
                      {getButtonText()}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href={`/deck/${currentDeck.id}/chat`} onClick={() => setMobileMenuOpen(false)}>
                      Ask AI
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/deck/${currentDeck.id}/combos`} onClick={() => setMobileMenuOpen(false)}>
                      Check Combos
                    </Link>
                  </DropdownMenuItem>
                  {currentDeck.moxfieldUrl && (
                    <DropdownMenuItem asChild>
                      <a
                        href={currentDeck.moxfieldUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        View on Moxfield
                      </a>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => { setMobileMenuOpen(false); setShowSettings(true); }}>
                    Settings
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings Sheet for mobile (triggered from dropdown) */}
          {showDeckActions && (
            <Sheet open={showSettings} onOpenChange={setShowSettings}>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>View Settings</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">View Mode</label>
                    <div className="flex gap-2">
                      {(['grid', 'list', 'visual'] as ViewMode[]).map((mode) => (
                        <Button
                          key={mode}
                          variant={viewMode === mode ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setViewMode(mode)}
                        >
                          {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sort By</label>
                    <div className="flex flex-wrap gap-2">
                      {(['name', 'cmc', 'type', 'color', 'cost'] as SortBy[]).map((sort) => (
                        <Button
                          key={sort}
                          variant={sortBy === sort ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSortBy(sort)}
                        >
                          {sort.toUpperCase()}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Group By</label>
                    <div className="flex flex-wrap gap-2">
                      {(['type', 'cmc', 'color', 'none'] as GroupBy[]).map((group) => (
                        <Button
                          key={group}
                          variant={groupBy === group ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setGroupBy(group)}
                        >
                          {group === 'none' ? 'None' : group.toUpperCase()}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}

          {/* Deck Changes Dialog for mobile save confirmation */}
          <DeckChangesDialog
            open={showChangesDialog}
            onOpenChange={setShowChangesDialog}
            changes={changes}
            onConfirm={performSave}
            onUndo={undoChanges}
            isLoading={mobileSaving}
          />
        </div>
      </div>
    </header>
  );
}
