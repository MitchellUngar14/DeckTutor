import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { DeckImporter } from '@/components/deck/DeckImporter';

export const metadata = {
  title: 'Import Deck - DeckTutor',
  description: 'Import your MTG deck from Moxfield to analyze combos and synergies.',
};

export default function ImportPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 container py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Import Your Deck</h1>
            <p className="text-muted-foreground">
              Paste a Moxfield deck URL to get started with combo analysis.
            </p>
          </div>

          <DeckImporter />

          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Supported formats:</strong> Commander/EDH, Modern,
              Standard, Legacy, Vintage, Pauper
            </p>
            <p>
              Don&apos;t have a deck on Moxfield?{' '}
              <a
                href="https://www.moxfield.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-primary"
              >
                Create one for free
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
