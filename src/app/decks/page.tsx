'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface CommanderCard {
  id: string;
  name: string;
  imageUris: {
    small?: string;
    normal?: string;
    large?: string;
    artCrop?: string;
  } | null;
}

interface SavedDeck {
  id: string;
  name: string;
  description: string | null;
  format: string | null;
  moxfieldId: string | null;
  commanders: CommanderCard[];
  createdAt: string;
  lastModifiedAt: string;
}

export default function SavedDecksPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [decks, setDecks] = useState<SavedDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchDecks();
    }
  }, [user]);

  const fetchDecks = async () => {
    try {
      const token = localStorage.getItem('decktutor-token');
      const response = await fetch('/api/user/decks', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDecks(data.decks);
      }
    } catch (error) {
      console.error('Error fetching decks:', error);
      toast.error('Failed to load decks');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (deckId: string) => {
    setDeleting(deckId);
    try {
      const token = localStorage.getItem('decktutor-token');
      const response = await fetch(`/api/user/decks/${deckId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setDecks(decks.filter((d) => d.id !== deckId));
        toast.success('Deck deleted');
      } else {
        toast.error('Failed to delete deck');
      }
    } catch (error) {
      console.error('Error deleting deck:', error);
      toast.error('Failed to delete deck');
    } finally {
      setDeleting(null);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Saved Decks</h1>
          <p className="text-muted-foreground mt-1">Your collection of saved deck lists</p>
        </div>
        <Button asChild>
          <Link href="/deck/import">Import New Deck</Link>
        </Button>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Loading your decks...</div>
      ) : decks.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground mb-4">You haven&apos;t saved any decks yet.</p>
            <Button asChild>
              <Link href="/deck/import">Import Your First Deck</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => {
            const commander = deck.commanders?.[0];
            const commanderImage = commander?.imageUris?.artCrop || commander?.imageUris?.normal;

            return (
              <Card key={deck.id} className="overflow-hidden">
                {/* Commander Art Banner */}
                {commanderImage && (
                  <div className="relative h-32 w-full">
                    <Image
                      src={commanderImage}
                      alt={commander?.name || 'Commander'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                  </div>
                )}
                <CardHeader className={commanderImage ? '-mt-8 relative z-10' : ''}>
                  <CardTitle className="line-clamp-1">{deck.name}</CardTitle>
                  <CardDescription>
                    {commander && <span className="block text-xs">{commander.name}</span>}
                    <span>
                      {deck.format && <span className="capitalize">{deck.format}</span>}
                      {deck.format && deck.moxfieldId && ' - '}
                      {deck.moxfieldId && <span>From Moxfield</span>}
                    </span>
                  </CardDescription>
                </CardHeader>
                {deck.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{deck.description}</p>
                  </CardContent>
                )}
                <CardFooter className="flex justify-between">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/deck/${deck.id}`}>View Deck</Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Deck</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete &quot;{deck.name}&quot;? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(deck.id)}
                          disabled={deleting === deck.id}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleting === deck.id ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
