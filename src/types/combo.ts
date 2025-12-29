export interface Combo {
  id: string;
  edhrecId?: string;
  name?: string;
  cards: string[];
  description: string;
  prerequisite?: string;
  steps: string[];
  result: string;
  colorIdentity: string[];
  sourceUrl?: string;
}

export interface DeckCombo {
  combo: Combo;
  isComplete: boolean;
  presentCards: string[];
  missingCards: string[];
}

export interface ComboCheckRequest {
  deckId?: string;
  cards: string[];
  commander?: string;
}

export interface ComboCheckResponse {
  combos: DeckCombo[];
  potentialCombos: PotentialCombo[];
  analyzedCards: number;
  processingTime: number;
}

export interface PotentialCombo {
  cards: string[];
  missingPieces: string[];
  description: string;
  sourceUrl?: string;
}
