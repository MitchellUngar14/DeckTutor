import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="container flex flex-col items-center justify-center gap-6 py-24 text-center md:py-32">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Discover Combos in
            <br />
            <span className="text-primary">Your MTG Decks</span>
          </h1>
          <p className="max-w-[42rem] text-lg text-muted-foreground sm:text-xl">
            Import your deck from Moxfield, and let DeckTutor analyze it for
            powerful combos and synergies using EDHREC data.
          </p>
          <div className="flex gap-4">
            <Button size="lg" asChild>
              <Link href="/deck/import">Import Deck</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container py-16">
          <h2 className="mb-12 text-center text-3xl font-bold">How It Works</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-lg border p-6 text-center">
              <div className="mb-4 text-4xl">1</div>
              <h3 className="mb-2 text-xl font-semibold">Import Your Deck</h3>
              <p className="text-muted-foreground">
                Paste your Moxfield deck URL and we&apos;ll fetch all your
                cards with full art and data from Scryfall.
              </p>
            </div>
            <div className="rounded-lg border p-6 text-center">
              <div className="mb-4 text-4xl">2</div>
              <h3 className="mb-2 text-xl font-semibold">Analyze Combos</h3>
              <p className="text-muted-foreground">
                We cross-reference your cards with EDHREC&apos;s combo database
                to find synergies you might have missed.
              </p>
            </div>
            <div className="rounded-lg border p-6 text-center">
              <div className="mb-4 text-4xl">3</div>
              <h3 className="mb-2 text-xl font-semibold">Discover Potential</h3>
              <p className="text-muted-foreground">
                See which cards you&apos;re missing to complete powerful
                combos, and export your optimized deck back to Moxfield.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container py-16">
          <div className="rounded-xl bg-muted p-8 text-center md:p-12">
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">
              Ready to find hidden combos in your deck?
            </h2>
            <p className="mb-6 text-muted-foreground">
              Import your Commander deck now and discover synergies you never
              knew existed.
            </p>
            <Button size="lg" asChild>
              <Link href="/deck/import">Get Started</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
