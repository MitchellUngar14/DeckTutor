import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GeminiModel, DeckContext, CommanderBracket, ChatSettings } from '@/types';
import { COMMANDER_BRACKETS } from '@/types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Custom error class following existing pattern (MoxfieldError, ScryfallError, ComboServiceError)
export class GeminiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

export interface GeminiChatRequest {
  model: GeminiModel;
  systemPrompt: string;
  conversationHistory: Array<{ role: 'user' | 'model'; content: string }>;
  userMessage: string;
}

export interface GeminiChatResponse {
  text: string;
  tokensUsed?: number;
}

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!GEMINI_API_KEY) {
    throw new GeminiError('GEMINI_API_KEY not configured', 500);
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return genAI;
}

export async function geminiChat(request: GeminiChatRequest): Promise<GeminiChatResponse> {
  const client = getClient();

  try {
    const model = client.getGenerativeModel({
      model: request.model,
      systemInstruction: request.systemPrompt,
    });

    // Build chat history in Gemini format
    const history = request.conversationHistory.map((msg) => ({
      role: msg.role as 'user' | 'model',
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(request.userMessage);
    const response = result.response;

    return {
      text: response.text(),
      tokensUsed: response.usageMetadata?.totalTokenCount,
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new GeminiError(
      error instanceof Error ? error.message : 'Gemini API error',
      502
    );
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const client = getClient();
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });
    await model.generateContent('ping');
    return true;
  } catch {
    return false;
  }
}

// Build system prompt with optional deck context
export function buildSystemPrompt(
  deckContext: DeckContext | null | undefined,
  bracketLevel: CommanderBracket,
  includeContext: boolean
): string {
  const bracketInfo = COMMANDER_BRACKETS[bracketLevel];

  let prompt = `You are an expert Magic: The Gathering Commander deck advisor. You provide helpful, accurate advice about deck building, strategy, and card choices.

## Your Role
- Help players improve their Commander decks
- Suggest cards that fit their strategy and budget
- Explain synergies and combos
- Provide strategic advice for gameplay
- Answer questions about MTG rules and interactions

## Power Level Context
The user is building for Bracket ${bracketLevel} (${bracketInfo.name}): ${bracketInfo.description}
Tailor your suggestions to this power level. Don't suggest cEDH staples for casual decks, and vice versa.

## BANNED CARDS - NEVER SUGGEST THESE
The following cards are BANNED in Commander. Do NOT include them in any deck suggestions:
- Ancestral Recall
- Balance
- Biorhythm
- Black Lotus
- Braids, Cabal Minion
- Channel
- Chaos Orb
- Coalition Victory
- Dockside Extortionist (banned September 2024)
- Emrakul, the Aeons Torn
- Erayo, Soratami Ascendant
- Falling Star
- Fastbond
- Flash
- Gifts Ungiven
- Golos, Tireless Pilgrim
- Griselbrand
- Hullbreacher
- Iona, Shield of Emeria
- Jeweled Lotus (banned September 2024)
- Karakas
- Leovold, Emissary of Trest
- Library of Alexandria
- Limited Resources
- Lutri, the Spellchaser
- Mana Crypt (banned September 2024)
- Mox Emerald
- Mox Jet
- Mox Pearl
- Mox Ruby
- Mox Sapphire
- Nadu, Winged Wisdom (banned September 2024)
- Panoptic Mirror
- Paradox Engine
- Primeval Titan
- Prophet of Kruphix
- Recurring Nightmare
- Rofellos, Llanowar Emissary
- Shahrazad
- Sundering Titan
- Sway of the Stars
- Sylvan Primordial
- Time Vault
- Time Walk
- Tinker
- Tolarian Academy
- Trade Secrets
- Upheaval
- Yawgmoth's Bargain

## Commander Deck Requirements
- Commander decks MUST have EXACTLY 100 cards total (including the commander)
- If there's 1 commander: 99 cards in mainboard + 1 commander = 100
- If there are 2 partner commanders: 98 cards in mainboard + 2 commanders = 100
- All cards must be within the commander's color identity
- No more than 1 copy of each card (except basic lands)
- ALWAYS verify your deck list totals exactly 100 cards before outputting

## Guidelines
- Always explain WHY a card is good, not just that it is
- Consider budget when suggesting expensive cards
- Mention potential downsides or anti-synergies
- Use official card names exactly as printed
- When discussing combos, explain each step
- Be concise but thorough
- NEVER suggest banned cards

## Deck Suggestion Format
When you want to suggest a complete deck list or significant changes, output the deck in this exact format so users can compare:

[SUGGESTED_DECK]
// Commanders
1 Commander Name

// Mainboard
1 Card Name
1 Another Card

// Lands
1 Command Tower
10 Mountain
[/SUGGESTED_DECK]

IMPORTANT:
- Do NOT wrap the deck list in code blocks (\`\`\`)
- Count your cards! The total MUST equal exactly 100
- List each card on its own line with quantity first (e.g., "1 Sol Ring")
- Only use this format when specifically asked to provide a deck list or suggest major changes
`;

  if (includeContext && deckContext) {
    prompt += `
## Current Deck Analysis
**Deck Name:** ${deckContext.deckName}
**Commander(s):** ${deckContext.commanders.join(', ')}
**Color Identity:** ${deckContext.colorIdentity.join('')}
**Format:** ${deckContext.format}

### Statistics
- Total Cards: ${deckContext.stats.cardCount}
- Average CMC: ${deckContext.stats.averageCmc.toFixed(2)}
- Mana Curve: ${Object.entries(deckContext.stats.manaCurve).map(([cmc, count]) => `${cmc}:${count}`).join(', ')}
- Color Distribution: ${Object.entries(deckContext.stats.colorDistribution).filter(([, count]) => count > 0).map(([color, count]) => `${color}:${count}`).join(', ')}

### Detected Synergies (${deckContext.synergies.length} found)
${deckContext.synergies.slice(0, 5).map((s) => `- ${s.type}: ${s.description} (${s.strength})`).join('\n')}

### Complete Combos in Deck (${deckContext.combos.length} found)
${deckContext.combos.slice(0, 3).map((c) => `- ${c.combo.cards.join(' + ')}: ${c.combo.result}`).join('\n')}

### Potential Combos (${deckContext.potentialCombos.length} found)
${deckContext.potentialCombos.slice(0, 3).map((p) => `- Has: ${p.cards.join(', ')} | Missing: ${p.missingPieces.join(', ')}`).join('\n')}

### Full Deck List
**Mainboard (${deckContext.mainboardCards.length} cards):**
${deckContext.mainboardCards.join(', ')}

${deckContext.sideboardCards.length > 0 ? `**Sideboard (${deckContext.sideboardCards.length} cards):**
${deckContext.sideboardCards.join(', ')}` : ''}

Use this deck information to provide personalized advice. Reference specific cards in the deck when relevant.
`;
  }

  return prompt;
}
