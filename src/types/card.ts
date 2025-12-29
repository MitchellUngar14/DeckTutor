export interface ScryfallCard {
  id: string;
  oracle_id: string;
  name: string;
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  colors?: string[];
  color_identity: string[];
  keywords?: string[];
  legalities: Record<string, string>;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    art_crop: string;
    border_crop: string;
  };
  card_faces?: Array<{
    name: string;
    mana_cost?: string;
    type_line: string;
    oracle_text?: string;
    image_uris?: {
      small: string;
      normal: string;
      large: string;
      art_crop: string;
      border_crop: string;
    };
  }>;
  prices?: {
    usd?: string;
    usd_foil?: string;
    eur?: string;
  };
  rarity: string;
  set: string;
  set_name: string;
  collector_number: string;
  scryfall_uri: string;
  edhrec_rank?: number;
  layout: string;
}

export interface Card {
  id: string;
  oracleId: string;
  name: string;
  manaCost?: string;
  cmc: number;
  typeLine: string;
  oracleText?: string;
  colors: string[];
  colorIdentity: string[];
  keywords: string[];
  legalities: Record<string, string>;
  imageUris: {
    small: string;
    normal: string;
    large: string;
    artCrop: string;
  };
  prices?: {
    usd?: string;
    eur?: string;
  };
  rarity: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  scryfallUri: string;
  edhrecRank?: number;
  layout: string;
}

export interface DeckCard {
  card: Card;
  quantity: number;
  board: 'mainboard' | 'sideboard' | 'maybeboard' | 'commanders';
  categories?: string[];
}

export type MtgColor = 'W' | 'U' | 'B' | 'R' | 'G';

export const MTG_COLOR_MAP: Record<MtgColor, { name: string; hex: string }> = {
  W: { name: 'White', hex: '#F8F6D8' },
  U: { name: 'Blue', hex: '#0E68AB' },
  B: { name: 'Black', hex: '#150B00' },
  R: { name: 'Red', hex: '#D3202A' },
  G: { name: 'Green', hex: '#00733E' },
};

export function mapScryfallCard(scryfall: ScryfallCard): Card {
  const imageUris = scryfall.image_uris || scryfall.card_faces?.[0]?.image_uris;

  return {
    id: scryfall.id,
    oracleId: scryfall.oracle_id,
    name: scryfall.name,
    manaCost: scryfall.mana_cost,
    cmc: scryfall.cmc,
    typeLine: scryfall.type_line,
    oracleText: scryfall.oracle_text,
    colors: scryfall.colors || [],
    colorIdentity: scryfall.color_identity,
    keywords: scryfall.keywords || [],
    legalities: scryfall.legalities,
    imageUris: {
      small: imageUris?.small || '',
      normal: imageUris?.normal || '',
      large: imageUris?.large || '',
      artCrop: imageUris?.art_crop || '',
    },
    prices: scryfall.prices ? {
      usd: scryfall.prices.usd,
      eur: scryfall.prices.eur,
    } : undefined,
    rarity: scryfall.rarity,
    setCode: scryfall.set,
    setName: scryfall.set_name,
    collectorNumber: scryfall.collector_number,
    scryfallUri: scryfall.scryfall_uri,
    edhrecRank: scryfall.edhrec_rank,
    layout: scryfall.layout,
  };
}
