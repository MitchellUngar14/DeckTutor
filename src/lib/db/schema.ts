import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  decimal,
  primaryKey,
} from 'drizzle-orm/pg-core';

// ============================================
// CARD DATA CACHE (from Scryfall)
// ============================================
export const cards = pgTable('cards', {
  id: uuid('id').primaryKey(),
  oracleId: uuid('oracle_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  manaCost: varchar('mana_cost', { length: 100 }),
  cmc: decimal('cmc', { precision: 4, scale: 1 }),
  typeLine: varchar('type_line', { length: 255 }),
  oracleText: text('oracle_text'),
  colors: text('colors').array(),
  colorIdentity: text('color_identity').array(),
  keywords: text('keywords').array(),
  legalities: jsonb('legalities').$type<Record<string, string>>(),
  imageUris: jsonb('image_uris').$type<{
    small?: string;
    normal?: string;
    large?: string;
    artCrop?: string;
  }>(),
  prices: jsonb('prices').$type<{ usd?: string; eur?: string }>(),
  scryfallUri: varchar('scryfall_uri', { length: 500 }),
  edhrecRank: integer('edhrec_rank'),
  setCode: varchar('set_code', { length: 10 }),
  setName: varchar('set_name', { length: 255 }),
  collectorNumber: varchar('collector_number', { length: 20 }),
  rarity: varchar('rarity', { length: 20 }),
  layout: varchar('layout', { length: 50 }),
  cachedAt: timestamp('cached_at', { withTimezone: true }).defaultNow(),
});

// ============================================
// SESSION-BASED TEMPORARY STORAGE
// ============================================
export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 64 }).primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }).defaultNow(),
  metadata: jsonb('metadata').$type<{ userAgent?: string }>(),
});

export const sessionDecks = pgTable('session_decks', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: varchar('session_id', { length: 64 })
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  moxfieldId: varchar('moxfield_id', { length: 50 }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  format: varchar('format', { length: 50 }).default('commander'),
  commanderIds: uuid('commander_ids').array(),
  importedAt: timestamp('imported_at', { withTimezone: true }).defaultNow(),
  lastModifiedAt: timestamp('last_modified_at', { withTimezone: true }).defaultNow(),
  moxfieldData: jsonb('moxfield_data'),
});

export const sessionDeckCards = pgTable('session_deck_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  deckId: uuid('deck_id')
    .notNull()
    .references(() => sessionDecks.id, { onDelete: 'cascade' }),
  cardId: uuid('card_id')
    .notNull()
    .references(() => cards.id),
  quantity: integer('quantity').notNull().default(1),
  board: varchar('board', { length: 20 }).default('mainboard'),
  categories: text('categories').array(),
});

// ============================================
// COMBO DATA (from EDHREC)
// ============================================
export const combos = pgTable('combos', {
  id: uuid('id').primaryKey().defaultRandom(),
  edhrecId: varchar('edhrec_id', { length: 100 }).unique(),
  name: varchar('name', { length: 255 }),
  description: text('description'),
  result: text('result'),
  colorIdentity: text('color_identity').array(),
  steps: text('steps').array(),
  sourceUrl: varchar('source_url', { length: 500 }),
  cachedAt: timestamp('cached_at', { withTimezone: true }).defaultNow(),
});

export const comboCards = pgTable(
  'combo_cards',
  {
    comboId: uuid('combo_id')
      .notNull()
      .references(() => combos.id, { onDelete: 'cascade' }),
    oracleId: uuid('oracle_id').notNull(),
    isRequired: boolean('is_required').default(true),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.comboId, table.oracleId] }),
  })
);

export const sessionDeckCombos = pgTable('session_deck_combos', {
  id: uuid('id').primaryKey().defaultRandom(),
  deckId: uuid('deck_id')
    .notNull()
    .references(() => sessionDecks.id, { onDelete: 'cascade' }),
  comboId: uuid('combo_id')
    .notNull()
    .references(() => combos.id),
  isComplete: boolean('is_complete').default(false),
  missingCards: uuid('missing_cards').array(),
  detectedAt: timestamp('detected_at', { withTimezone: true }).defaultNow(),
});

// ============================================
// FUTURE: USER ACCOUNTS & PERSISTENT DECKS
// ============================================
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  emailVerified: boolean('email_verified').default(false),
  passwordHash: varchar('password_hash', { length: 255 }),
  displayName: varchar('display_name', { length: 100 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  moxfieldLinked: boolean('moxfield_linked').default(false),
  moxfieldUsername: varchar('moxfield_username', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  preferences: jsonb('preferences').$type<{ theme?: string }>(),
});

export const userDecks = pgTable('user_decks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  moxfieldId: varchar('moxfield_id', { length: 50 }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  format: varchar('format', { length: 50 }).default('commander'),
  commanderIds: uuid('commander_ids').array(),
  isPublic: boolean('is_public').default(false),
  viewCount: integer('view_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  lastModifiedAt: timestamp('last_modified_at', { withTimezone: true }).defaultNow(),
  syncedWithMoxfieldAt: timestamp('synced_with_moxfield_at', { withTimezone: true }),
  moxfieldData: jsonb('moxfield_data'),
});

export const userDeckCards = pgTable('user_deck_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  deckId: uuid('deck_id')
    .notNull()
    .references(() => userDecks.id, { onDelete: 'cascade' }),
  cardId: uuid('card_id')
    .notNull()
    .references(() => cards.id),
  quantity: integer('quantity').notNull().default(1),
  board: varchar('board', { length: 20 }).default('mainboard'),
  categories: text('categories').array(),
});

export const userDeckCombos = pgTable('user_deck_combos', {
  id: uuid('id').primaryKey().defaultRandom(),
  deckId: uuid('deck_id')
    .notNull()
    .references(() => userDecks.id, { onDelete: 'cascade' }),
  comboId: uuid('combo_id')
    .notNull()
    .references(() => combos.id),
  isComplete: boolean('is_complete').default(false),
  missingCards: uuid('missing_cards').array(),
  isFavorited: boolean('is_favorited').default(false),
  notes: text('notes'),
});

// ============================================
// CUSTOM COMBOS (User-created, deck-specific)
// ============================================
export const customCombos = pgTable('custom_combos', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  deckId: uuid('deck_id')
    .notNull()
    .references(() => userDecks.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull(),
  cardNames: text('card_names').array().notNull(),
  cardIds: text('card_ids').array(),
  colorIdentity: text('color_identity').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const oauthAccounts = pgTable('oauth_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 50 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
});
