'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { DeckComparison } from '@/components/deck/DeckComparison';
import { useDeckStore } from '@/stores/deckStore';
import { useChatStore } from '@/stores/chatStore';
import { ArrowLeft, MessageSquare } from 'lucide-react';

export default function DeckComparePage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.id as string;

  const { currentDeck } = useDeckStore();
  const { suggestedDeck, setSuggestedDeck } = useChatStore();

  const handleBackToChat = () => {
    router.push(`/deck/${deckId}/chat`);
  };

  const handleClearSuggestion = () => {
    setSuggestedDeck(null);
    router.push(`/deck/${deckId}/chat`);
  };

  if (!currentDeck) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Deck not found</h1>
            <p className="text-muted-foreground">
              The deck you&apos;re looking for doesn&apos;t exist or has expired.
            </p>
            <Button asChild>
              <Link href="/deck/import">Import a Deck</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!suggestedDeck) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">No deck suggestion available</h1>
            <p className="text-muted-foreground">
              Ask the AI to suggest deck changes to see a comparison.
            </p>
            <Button onClick={handleBackToChat}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Go to Chat
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Deck Comparison</h1>
            <p className="text-sm text-muted-foreground">
              Comparing AI suggestion with {currentDeck.name}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleBackToChat}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Chat
            </Button>
            <Button variant="ghost" onClick={handleClearSuggestion}>
              Clear Suggestion
            </Button>
          </div>
        </div>

        {/* Comparison */}
        <DeckComparison originalDeck={currentDeck} suggestedDeck={suggestedDeck} />
      </main>

      <Footer />
    </div>
  );
}
