import type { DeckStats, Synergy, DeckCombo, PotentialCombo } from './';

// Commander Bracket power levels (1-5 scale)
export type CommanderBracket = 1 | 2 | 3 | 4 | 5;

export const COMMANDER_BRACKETS: Record<CommanderBracket, { name: string; description: string }> = {
  1: { name: 'Exhibition', description: 'Precons, casual, fun first' },
  2: { name: 'Core', description: 'Upgraded precons, focused synergies' },
  3: { name: 'Upgraded', description: 'Strong decks, efficient combos' },
  4: { name: 'Optimized', description: 'Tuned lists, strong combos' },
  5: { name: 'cEDH', description: 'Competitive, fast wins' },
};

// AI Providers
export type AIProvider = 'gemini' | 'openai';

// Available Gemini models
export const GEMINI_MODELS = {
  'gemini-2.5-pro': { name: 'Gemini 2.5 Pro', description: 'Advanced reasoning' },
  'gemini-2.5-flash': { name: 'Gemini 2.5 Flash', description: 'Fast and efficient' },
  'gemini-2.0-flash': { name: 'Gemini 2.0 Flash', description: 'Stable and fast' },
} as const;

export type GeminiModel = keyof typeof GEMINI_MODELS;

// Available OpenAI models
export const OPENAI_MODELS = {
  'gpt-4o': { name: 'GPT-4o', description: 'Most capable, multimodal' },
  'gpt-4o-mini': { name: 'GPT-4o Mini', description: 'Fast and affordable' },
  'gpt-4-turbo': { name: 'GPT-4 Turbo', description: 'Powerful with vision' },
  'o1': { name: 'o1', description: 'Advanced reasoning' },
  'o1-mini': { name: 'o1 Mini', description: 'Fast reasoning' },
  'o3-mini': { name: 'o3 Mini', description: 'Latest reasoning model' },
} as const;

export type OpenAIModel = keyof typeof OPENAI_MODELS;

export type AIModel = GeminiModel | OpenAIModel;

// Chat message
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedDeck?: ParsedDeckSuggestion; // If AI suggested a deck list
}

// Parsed deck suggestion from AI response
export interface ParsedDeckSuggestion {
  commanders: Array<{ name: string; quantity: number }>;
  mainboard: Array<{ name: string; quantity: number }>;
  sideboard: Array<{ name: string; quantity: number }>;
  rawText: string;
}

// Deck context passed to AI
export interface DeckContext {
  deckId: string;
  deckName: string;
  commanders: string[];
  mainboardCards: string[];
  sideboardCards: string[];
  stats: DeckStats;
  synergies: Synergy[];
  combos: DeckCombo[];
  potentialCombos: PotentialCombo[];
  colorIdentity: string[];
  format: string;
}

// Chat conversation
export interface ChatConversation {
  id: string;
  deckId: string | null; // null for standalone chat
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

// Chat settings
export interface ChatSettings {
  provider: AIProvider;
  model: AIModel;
  bracketLevel: CommanderBracket;
  includeContext: boolean;
}

// API request/response types
export interface ChatRequest {
  message: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  deckContext?: DeckContext | null;
  settings: ChatSettings;
}

export interface ChatResponse {
  message: string;
  model: string;
  tokensUsed?: number;
}
