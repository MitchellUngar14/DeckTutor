'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useDeckStore } from '@/stores/deckStore';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CardAutocomplete } from '@/components/combo/CardAutocomplete';
import { CardPreview } from '@/components/card/CardPreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import type { Card as CardType } from '@/types';

export default function EditDeckComboPage() {
  const router = useRouter();
  const params = useParams();
  const deckId = params.id as string;
  const comboId = params.comboId as string;
  const { user, loading: authLoading } = useAuth();
  const { currentDeck } = useDeckStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewCard, setPreviewCard] = useState<CardType | null>(null);
  const [cardCache, setCardCache] = useState<Map<string, CardType>>(new Map());

  // Build card map from current deck for quick lookup
  const deckCardMap = useCallback(() => {
    if (!currentDeck) return new Map<string, CardType>();
    const map = new Map<string, CardType>();
    for (const commander of currentDeck.commanders) {
      map.set(commander.name.toLowerCase(), commander);
    }
    for (const dc of currentDeck.mainboard) {
      map.set(dc.card.name.toLowerCase(), dc.card);
    }
    for (const dc of currentDeck.sideboard) {
      map.set(dc.card.name.toLowerCase(), dc.card);
    }
    return map;
  }, [currentDeck]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && deckId && comboId) {
      fetchCombo();
    }
  }, [user, deckId, comboId]);

  const fetchCombo = async () => {
    try {
      const token = localStorage.getItem('decktutor-token');
      const response = await fetch(`/api/user/decks/${deckId}/combos/${comboId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setName(data.combo.name);
        setDescription(data.combo.description);
        setSelectedCards(data.combo.cardNames || []);
      } else if (response.status === 404) {
        toast.error('Combo not found');
        router.push(`/deck/${deckId}/combos`);
      }
    } catch (error) {
      console.error('Error fetching combo:', error);
      toast.error('Failed to load combo');
    } finally {
      setLoading(false);
    }
  };

  const fetchCardData = useCallback(async (cardName: string) => {
    // First check deck cards
    const deckCards = deckCardMap();
    const deckCard = deckCards.get(cardName.toLowerCase());
    if (deckCard) {
      setPreviewCard(deckCard);
      return;
    }

    // Then check cache
    if (cardCache.has(cardName)) {
      setPreviewCard(cardCache.get(cardName) || null);
      return;
    }

    try {
      const response = await fetch(
        `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`
      );
      if (response.ok) {
        const data = await response.json();
        const card: CardType = {
          id: data.id,
          oracleId: data.oracle_id,
          name: data.name,
          manaCost: data.mana_cost || '',
          cmc: data.cmc || 0,
          typeLine: data.type_line || '',
          oracleText: data.oracle_text || '',
          colors: data.colors || [],
          colorIdentity: data.color_identity || [],
          keywords: data.keywords || [],
          legalities: data.legalities || {},
          imageUris: data.image_uris || null,
          cardFaces: data.card_faces || null,
          prices: data.prices || {},
          rarity: data.rarity || 'common',
          setCode: data.set || '',
          setName: data.set_name || '',
          collectorNumber: data.collector_number || '',
          scryfallUri: data.scryfall_uri || '',
          layout: data.layout || 'normal',
          edhrecRank: data.edhrec_rank,
        };
        setCardCache((prev) => new Map(prev).set(cardName, card));
        setPreviewCard(card);
      }
    } catch (error) {
      console.error('Error fetching card:', error);
    }
  }, [cardCache, deckCardMap]);

  const handleCardHover = useCallback((cardName: string | null) => {
    if (cardName) {
      fetchCardData(cardName);
    }
  }, [fetchCardData]);

  const handleCardAdd = (cardName: string) => {
    setSelectedCards((prev) => [...prev, cardName]);
    fetchCardData(cardName);
  };

  const handleCardRemove = (cardName: string) => {
    setSelectedCards((prev) => prev.filter((c) => c !== cardName));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a combo name');
      return;
    }

    if (!description.trim()) {
      toast.error('Please enter a combo description');
      return;
    }

    if (selectedCards.length < 2) {
      toast.error('Please select at least 2 cards for the combo');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('decktutor-token');
      const response = await fetch(`/api/user/decks/${deckId}/combos/${comboId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          cardNames: selectedCards,
        }),
      });

      if (response.ok) {
        toast.success('Combo updated successfully');
        router.push(`/deck/${deckId}/combos`);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update combo');
      }
    } catch (error) {
      console.error('Error updating combo:', error);
      toast.error('Failed to update combo');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user || loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">Loading...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 lg:pr-[380px]">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href={`/deck/${deckId}/combos`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Deck Analysis
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Edit Combo</h1>
          <p className="text-muted-foreground mt-1">
            Update your custom combo details
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Combo Details</CardTitle>
            <CardDescription>
              Update the name, cards, and description
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Combo Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Infinite Mana Combo"
                />
              </div>

              <div className="space-y-2">
                <Label>Cards in Combo</Label>
                <CardAutocomplete
                  selectedCards={selectedCards}
                  onCardAdd={handleCardAdd}
                  onCardRemove={handleCardRemove}
                  onCardHover={handleCardHover}
                  placeholder="Search for cards to add..."
                />
                {selectedCards.length < 2 && (
                  <p className="text-sm text-muted-foreground">
                    Select at least 2 cards for this combo
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">How It Works</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe how this combo works, what it does, and any setup required..."
                  rows={6}
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href={`/deck/${deckId}/combos`}>Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      {/* Desktop Fixed Card Preview Panel */}
      <div className="hidden lg:block fixed right-4 top-20 w-[350px] h-[calc(100vh-100px)] rounded-lg border bg-background p-4 shadow-lg overflow-hidden z-40">
        <h3 className="mb-4 font-semibold">Card Preview</h3>
        <div className="h-[calc(100%-2rem)] overflow-y-auto">
          <CardPreview card={previewCard} />
        </div>
      </div>

      <Footer />
    </div>
  );
}
