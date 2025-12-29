'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ChatContainer } from '@/components/chat';

export default function ChatPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 flex flex-col container mx-auto max-w-4xl">
        <div className="flex-1 flex flex-col border-x bg-background">
          <div className="px-4 py-3 border-b">
            <h1 className="text-xl font-semibold">AI Deck Advisor</h1>
            <p className="text-sm text-muted-foreground">
              Ask questions about deck building, card choices, combos, or strategy
            </p>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <ChatContainer />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
