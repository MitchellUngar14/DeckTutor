import type { Card, Synergy, SynergyType } from '@/types';

interface SynergyPattern {
  type: SynergyType;
  name: string;
  detect: (cards: Card[], commander?: Card) => string[] | null;
  description: (matchedCards: string[]) => string;
  strength: 'strong' | 'moderate' | 'minor';
  minCards: number;
}

// Common creature types for tribal detection
const TRIBAL_TYPES = [
  'Goblin', 'Elf', 'Zombie', 'Vampire', 'Dragon', 'Angel', 'Demon',
  'Merfolk', 'Wizard', 'Warrior', 'Soldier', 'Knight', 'Elemental',
  'Beast', 'Bird', 'Cat', 'Dog', 'Dinosaur', 'Pirate', 'Rogue',
  'Cleric', 'Shaman', 'Druid', 'Sliver', 'Human', 'Spirit', 'Artifact',
];

// Keywords that create synergies when multiple cards share them
const SYNERGY_KEYWORDS = [
  { keyword: 'Flying', minCards: 5 },
  { keyword: 'Deathtouch', minCards: 4 },
  { keyword: 'Lifelink', minCards: 4 },
  { keyword: 'Haste', minCards: 5 },
  { keyword: 'Trample', minCards: 5 },
  { keyword: 'First strike', minCards: 4 },
  { keyword: 'Double strike', minCards: 3 },
  { keyword: 'Vigilance', minCards: 5 },
  { keyword: 'Menace', minCards: 4 },
];

function getCardsWithText(cards: Card[], patterns: string[]): string[] {
  return cards
    .filter(card => {
      const text = (card.oracleText || '').toLowerCase();
      return patterns.some(p => text.includes(p.toLowerCase()));
    })
    .map(c => c.name);
}

function getCardsWithType(cards: Card[], type: string): string[] {
  return cards
    .filter(card => card.typeLine.toLowerCase().includes(type.toLowerCase()))
    .map(c => c.name);
}

function getCardsWithKeyword(cards: Card[], keyword: string): string[] {
  return cards
    .filter(card =>
      card.keywords.some(k => k.toLowerCase() === keyword.toLowerCase()) ||
      (card.oracleText || '').toLowerCase().includes(keyword.toLowerCase())
    )
    .map(c => c.name);
}

const SYNERGY_PATTERNS: SynergyPattern[] = [
  // Sacrifice synergies
  {
    type: 'sacrifice',
    name: 'Sacrifice Matters',
    detect: (cards) => {
      const sacrificeCards = getCardsWithText(cards, [
        'sacrifice a creature',
        'sacrifice a permanent',
        'whenever a creature dies',
        'whenever another creature dies',
        'when this creature dies',
        'sacrifice another',
      ]);
      return sacrificeCards.length >= 4 ? sacrificeCards : null;
    },
    description: (matched) => `${matched.length} cards that synergize with sacrificing permanents`,
    strength: 'strong',
    minCards: 4,
  },

  // Token synergies
  {
    type: 'tokens',
    name: 'Token Generation',
    detect: (cards) => {
      const tokenCards = getCardsWithText(cards, [
        'create a',
        'creates a',
        'create two',
        'create three',
        'token',
        'populate',
      ]);
      return tokenCards.length >= 5 ? tokenCards : null;
    },
    description: (matched) => `${matched.length} cards that create or benefit from tokens`,
    strength: 'strong',
    minCards: 5,
  },

  // +1/+1 Counter synergies
  {
    type: 'counters',
    name: '+1/+1 Counters',
    detect: (cards) => {
      const counterCards = getCardsWithText(cards, [
        '+1/+1 counter',
        'proliferate',
        'modular',
        'evolve',
        'outlast',
        'bolster',
        'support',
      ]);
      return counterCards.length >= 4 ? counterCards : null;
    },
    description: (matched) => `${matched.length} cards that use +1/+1 counters`,
    strength: 'strong',
    minCards: 4,
  },

  // Graveyard synergies
  {
    type: 'graveyard',
    name: 'Graveyard Matters',
    detect: (cards) => {
      const graveyardCards = getCardsWithText(cards, [
        'from your graveyard',
        'in your graveyard',
        'return from your graveyard',
        'exile from your graveyard',
        'mill',
        'dredge',
        'flashback',
        'unearth',
        'escape',
        'delve',
      ]);
      return graveyardCards.length >= 4 ? graveyardCards : null;
    },
    description: (matched) => `${matched.length} cards that interact with the graveyard`,
    strength: 'strong',
    minCards: 4,
  },

  // Artifact synergies
  {
    type: 'artifacts',
    name: 'Artifact Synergy',
    detect: (cards) => {
      const artifactCount = cards.filter(c => c.typeLine.includes('Artifact')).length;
      if (artifactCount < 10) return null;

      const synergyCards = getCardsWithText(cards, [
        'artifact you control',
        'artifacts you control',
        'whenever an artifact',
        'artifact enters',
        'affinity for artifacts',
        'metalcraft',
      ]);
      return synergyCards.length >= 3 ? synergyCards : null;
    },
    description: (matched) => `${matched.length} cards that synergize with artifacts`,
    strength: 'moderate',
    minCards: 3,
  },

  // Enchantment synergies
  {
    type: 'enchantments',
    name: 'Enchantment Synergy',
    detect: (cards) => {
      const enchantmentCount = cards.filter(c => c.typeLine.includes('Enchantment')).length;
      if (enchantmentCount < 8) return null;

      const synergyCards = getCardsWithText(cards, [
        'enchantment you control',
        'enchantments you control',
        'whenever an enchantment',
        'enchantment enters',
        'constellation',
      ]);
      return synergyCards.length >= 3 ? synergyCards : null;
    },
    description: (matched) => `${matched.length} cards that synergize with enchantments`,
    strength: 'moderate',
    minCards: 3,
  },

  // Lands matter
  {
    type: 'lands',
    name: 'Lands Matter',
    detect: (cards) => {
      const landCards = getCardsWithText(cards, [
        'landfall',
        'whenever a land enters',
        'land enters the battlefield',
        'play an additional land',
        'search your library for a land',
        'lands you control',
      ]);
      return landCards.length >= 4 ? landCards : null;
    },
    description: (matched) => `${matched.length} cards that care about lands entering`,
    strength: 'strong',
    minCards: 4,
  },

  // Spellslinger
  {
    type: 'spellslinger',
    name: 'Spellslinger',
    detect: (cards) => {
      const spellCards = getCardsWithText(cards, [
        'whenever you cast an instant',
        'whenever you cast a sorcery',
        'whenever you cast a noncreature',
        'magecraft',
        'storm',
        'copy target instant',
        'copy target sorcery',
      ]);
      return spellCards.length >= 4 ? spellCards : null;
    },
    description: (matched) => `${matched.length} cards that reward casting instants/sorceries`,
    strength: 'strong',
    minCards: 4,
  },

  // Voltron / Equipment
  {
    type: 'voltron',
    name: 'Equipment/Aura Voltron',
    detect: (cards) => {
      const equipmentCards = cards.filter(c =>
        c.typeLine.includes('Equipment') ||
        (c.typeLine.includes('Aura') && (c.oracleText || '').includes('Enchant creature'))
      );
      const voltronCards = getCardsWithText(cards, [
        'equipped creature',
        'equip',
        'attach',
        'enchanted creature',
        'whenever equipped creature',
      ]);
      const allVoltron = [...new Set([...equipmentCards.map(c => c.name), ...voltronCards])];
      return allVoltron.length >= 5 ? allVoltron : null;
    },
    description: (matched) => `${matched.length} equipment/auras for a voltron strategy`,
    strength: 'moderate',
    minCards: 5,
  },

  // Card draw synergy
  {
    type: 'draw',
    name: 'Card Draw Synergy',
    detect: (cards) => {
      const drawCards = getCardsWithText(cards, [
        'whenever you draw',
        'draw a card',
        'draws a card',
        'draw two',
        'draw three',
        'draw cards equal',
      ]);
      return drawCards.length >= 6 ? drawCards : null;
    },
    description: (matched) => `${matched.length} cards that draw or care about drawing`,
    strength: 'moderate',
    minCards: 6,
  },

  // Ramp package
  {
    type: 'ramp',
    name: 'Mana Ramp Package',
    detect: (cards) => {
      const rampCards = [
        ...cards.filter(c => c.typeLine.includes('Land') && (c.oracleText || '').includes('add')),
        ...getCardsWithText(cards, [
          'add {',
          'search your library for a basic land',
          'search your library for a land',
          'untap target land',
        ]).map(name => cards.find(c => c.name === name)!),
      ].filter(Boolean);
      const uniqueNames = [...new Set(rampCards.map(c => c.name))];
      return uniqueNames.length >= 8 ? uniqueNames : null;
    },
    description: (matched) => `${matched.length} mana acceleration cards`,
    strength: 'minor',
    minCards: 8,
  },
];

export function detectSynergies(cards: Card[], commander?: Card): Synergy[] {
  const synergies: Synergy[] = [];
  let idCounter = 0;

  // Check each synergy pattern
  for (const pattern of SYNERGY_PATTERNS) {
    const matchedCards = pattern.detect(cards, commander);
    if (matchedCards && matchedCards.length >= pattern.minCards) {
      synergies.push({
        id: `synergy-${idCounter++}`,
        type: pattern.type,
        cards: matchedCards.slice(0, 10), // Limit to 10 cards
        description: pattern.description(matchedCards),
        strength: pattern.strength,
      });
    }
  }

  // Detect tribal synergies
  for (const tribe of TRIBAL_TYPES) {
    const tribalCards = cards.filter(c =>
      c.typeLine.toLowerCase().includes(tribe.toLowerCase())
    );
    if (tribalCards.length >= 5) {
      // Also find cards that care about this tribe
      const tribalCareCards = getCardsWithText(cards, [
        `${tribe}s you control`,
        `${tribe} you control`,
        `other ${tribe}`,
        `each ${tribe}`,
        `target ${tribe}`,
      ]);

      const allTribalCards = [...new Set([
        ...tribalCards.map(c => c.name),
        ...tribalCareCards,
      ])];

      synergies.push({
        id: `synergy-tribal-${tribe.toLowerCase()}`,
        type: 'tribal',
        cards: allTribalCards.slice(0, 10),
        description: `${tribalCards.length} ${tribe} creatures with tribal synergies`,
        strength: tribalCards.length >= 10 ? 'strong' : 'moderate',
      });
    }
  }

  // Detect keyword synergies
  for (const { keyword, minCards } of SYNERGY_KEYWORDS) {
    const keywordCards = getCardsWithKeyword(cards, keyword);
    if (keywordCards.length >= minCards) {
      synergies.push({
        id: `synergy-keyword-${keyword.toLowerCase().replace(' ', '-')}`,
        type: 'keyword',
        cards: keywordCards.slice(0, 10),
        description: `${keywordCards.length} creatures with ${keyword}`,
        strength: keywordCards.length >= minCards + 3 ? 'moderate' : 'minor',
      });
    }
  }

  // Commander synergy - cards that specifically work with the commander
  if (commander) {
    const commanderKeywords = commander.keywords || [];
    const commanderText = (commander.oracleText || '').toLowerCase();

    const commanderSynergyCards: string[] = [];

    // Find cards that match commander's strategy
    for (const card of cards) {
      if (card.id === commander.id) continue;

      const cardText = (card.oracleText || '').toLowerCase();

      // Check for matching keywords
      const sharedKeywords = card.keywords.filter(k => commanderKeywords.includes(k));
      if (sharedKeywords.length >= 2) {
        commanderSynergyCards.push(card.name);
        continue;
      }

      // Check for text pattern matches (simplified)
      if (commanderText.includes('attack') && cardText.includes('attack')) {
        commanderSynergyCards.push(card.name);
      } else if (commanderText.includes('sacrifice') && cardText.includes('sacrifice')) {
        commanderSynergyCards.push(card.name);
      } else if (commanderText.includes('token') && cardText.includes('token')) {
        commanderSynergyCards.push(card.name);
      }
    }

    if (commanderSynergyCards.length >= 3) {
      synergies.push({
        id: 'synergy-commander',
        type: 'commander',
        cards: commanderSynergyCards.slice(0, 10),
        description: `${commanderSynergyCards.length} cards that synergize with ${commander.name.split(',')[0]}`,
        strength: commanderSynergyCards.length >= 8 ? 'strong' : 'moderate',
      });
    }
  }

  // Sort by strength and return
  const strengthOrder = { strong: 0, moderate: 1, minor: 2 };
  return synergies.sort((a, b) => strengthOrder[a.strength] - strengthOrder[b.strength]);
}
