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

export interface Synergy {
  id: string;
  type: SynergyType;
  cards: string[];
  suggestedCards?: string[];
  description: string;
  strength: 'strong' | 'moderate' | 'minor';
}

export type SynergyType =
  | 'tribal'
  | 'keyword'
  | 'sacrifice'
  | 'tokens'
  | 'counters'
  | 'graveyard'
  | 'artifacts'
  | 'enchantments'
  | 'lands'
  | 'spellslinger'
  | 'voltron'
  | 'ramp'
  | 'draw'
  | 'commander';

export interface ComboCheckRequest {
  deckId?: string;
  cards: string[];
  commander?: string;
}

export interface ComboCheckResponse {
  combos: DeckCombo[];
  potentialCombos: PotentialCombo[];
  synergies: Synergy[];
  analyzedCards: number;
  processingTime: number;
}

export interface PotentialCombo {
  cards: string[];
  missingPieces: string[];
  description: string;
  sourceUrl?: string;
}
