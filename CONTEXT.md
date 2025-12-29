# Project Context: DeckTutor

## Overview

DeckTutor is a web application for Magic: The Gathering Commander/EDH players that imports decks from Moxfield, enriches them with Scryfall card data, and analyzes them for potential combos using EDHREC data. The application will be hosted on Vercel's free tier with a separate Python microservice for EDHREC integration.

**Core Value Proposition**: Help MTG players discover combos and synergies in their existing decks without manually cross-referencing EDHREC.

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | Next.js 14+ (App Router), TypeScript | Vercel-optimized, SSR, API routes as BFF |
| **Styling** | Tailwind CSS + shadcn/ui | Utility-first, accessible components |
| **State Management** | Zustand (UI) + TanStack Query (server state) | Lightweight, excellent caching |
| **Backend API** | Next.js Route Handlers (Vercel Serverless) | Free tier, auto-scaling |
| **Python Service** | FastAPI on Railway | pyedhrec requires Python runtime |
| **Database** | Neon PostgreSQL | Serverless-native, free tier, branching |
| **Cache** | Upstash Redis | Serverless Redis, Scryfall data caching |
| **ORM** | Drizzle ORM | Fast, type-safe, small bundle |
| **Monitoring** | Sentry (errors) + Vercel Analytics | Free tiers available |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VERCEL (Frontend + API)                      │
│  ┌──────────────┐  ┌──────────────────────────────────────────────┐ │
│  │   Next.js    │  │         Vercel Serverless Functions          │ │
│  │   Frontend   │  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │ │
│  │   (React)    │  │  │ /api/    │ │ /api/    │ │ /api/        │  │ │
│  │              │  │  │ decks    │ │ scryfall │ │ combos       │  │ │
│  └──────────────┘  │  └──────────┘ └──────────┘ └──────────────┘  │ │
│                    └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
            ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐
            │   Upstash   │ │    Neon     │ │ Python Service  │
            │   Redis     │ │ PostgreSQL  │ │   (Railway)     │
            │  (Cache)    │ │    (DB)     │ │   (pyedhrec)    │
            └─────────────┘ └─────────────┘ └─────────────────┘
                                                    │
                    ┌───────────────┬───────────────┘
                    ▼               ▼
            ┌─────────────┐ ┌─────────────┐
            │   Scryfall  │ │   EDHREC    │
            │     API     │ │  (scraped)  │
            └─────────────┘ └─────────────┘
```

### Frontend

**Framework**: Next.js 14+ with App Router and TypeScript

**Key Decisions**:
- Server Components for initial card-heavy page loads (reduces JS bundle)
- API routes act as BFF (Backend-for-Frontend) to proxy external services
- ISR (Incremental Static Regeneration) for card data caching

**State Management**:
- **Zustand**: UI state (view mode, sort/filter, hovered card)
- **TanStack Query**: Server state with aggressive caching (24h for card data)
- **React Hook Form**: Form handling for deck import

**Styling**:
- Tailwind CSS with MTG color identity theming
- shadcn/ui for accessible, copy-paste components
- Dark mode support via CSS variables

### Backend

**Vercel Serverless Functions** handle:
- Moxfield deck import/export (proxy to avoid CORS)
- Scryfall card data fetching with caching
- Session management
- Forwarding combo requests to Python service

**Python Microservice** (Railway/Fly.io):
- FastAPI application
- pyedhrec library integration for EDHREC combo data
- Health check endpoints
- CORS configured for Vercel frontend

**External API Integration**:
- **Scryfall**: 50-100ms delay between requests, use bulk `/cards/collection` endpoint
- **Moxfield**: Conservative 1 req/sec, exponential backoff
- **EDHREC**: Heavy caching, 2-5 req/sec max via pyedhrec

### Database

**Neon PostgreSQL** (Free Tier: 0.5GB storage):
- Session-based temporary storage (Phase 1)
- User accounts with persistent decks (Phase 2)
- Card data cache from Scryfall
- Combo data from EDHREC

**Upstash Redis** (Free Tier: 10K commands/day):
- Hot cache for card data (24h TTL)
- Rate limiting state
- Session tokens

### Infrastructure

**Hosting**:
- **Vercel** (Hobby): Frontend + API routes
- **Railway** ($5 free credit): Python FastAPI service
- **Neon**: PostgreSQL database
- **Upstash**: Redis cache

**CI/CD**:
- GitHub Actions for testing and deployment
- Automatic Vercel preview deployments on PRs
- Railway auto-deploy from main branch

## Implementation Plan

### Phase 1: Foundation (MVP)
1. Set up Next.js project with TypeScript, Tailwind, shadcn/ui
2. Configure Neon PostgreSQL + Drizzle ORM
3. Create database schema for cards, sessions, session_decks
4. Implement session-based temporary storage (48h TTL)
5. Build core CardImage and CardPreview components

### Phase 2: Moxfield Integration
1. Create `/api/decks/import` route handler
2. Parse Moxfield URLs and fetch deck data
3. Build DeckImporter component with progress states
4. Store imported decks in session storage
5. Implement deck view page with card list and preview pane

### Phase 3: Scryfall Integration
1. Set up Upstash Redis for caching
2. Create `/api/cards/[name]` and `/api/cards/bulk` routes
3. Implement multi-layer caching (Redis -> Postgres -> Scryfall)
4. Build card search with autocomplete
5. Add deck statistics (mana curve, color distribution)

### Phase 4: Python Service + EDHREC
1. Create FastAPI service with pyedhrec
2. Deploy to Railway with health checks
3. Create `/api/combos/check` proxy route in Vercel
4. Build ComboList and ComboCard components
5. Implement combo detection for imported decks

### Phase 5: Export + Polish
1. Implement Moxfield export (text format initially)
2. Add error boundaries and loading states
3. Implement circuit breaker for external services
4. Add Sentry error tracking
5. Performance optimization and testing

### Phase 6: User Accounts (Future)
1. Add Auth.js (NextAuth) with OAuth providers
2. Create users, user_decks tables
3. Implement session-to-user migration
4. Add deck persistence and management

## File Structure

```
decktutor/
├── app/
│   ├── layout.tsx                 # Root layout with providers
│   ├── page.tsx                   # Landing page
│   ├── deck/
│   │   ├── import/
│   │   │   └── page.tsx           # Moxfield import flow
│   │   └── [id]/
│   │       ├── page.tsx           # Deck view
│   │       └── combos/
│   │           └── page.tsx       # Combo analysis
│   └── api/
│       ├── decks/
│       │   ├── import/route.ts
│       │   └── export/route.ts
│       ├── cards/
│       │   ├── [name]/route.ts
│       │   └── bulk/route.ts
│       ├── combos/
│       │   └── check/route.ts
│       └── health/route.ts
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   ├── deck/
│   │   ├── DeckList.tsx
│   │   ├── DeckCard.tsx
│   │   ├── DeckStats.tsx
│   │   ├── DeckImporter.tsx
│   │   └── CategoryGroup.tsx
│   ├── card/
│   │   ├── CardImage.tsx
│   │   ├── CardPreview.tsx
│   │   ├── CardTooltip.tsx
│   │   └── CardSearchInput.tsx
│   ├── combos/
│   │   ├── ComboCard.tsx
│   │   └── ComboList.tsx
│   ├── ui/                        # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── skeleton.tsx
│   │   └── toast.tsx
│   └── charts/
│       ├── ManaCurve.tsx
│       └── ColorPie.tsx
├── lib/
│   ├── clients/
│   │   ├── moxfield.ts
│   │   ├── scryfall.ts
│   │   └── combo-service.ts
│   ├── db/
│   │   ├── index.ts               # Drizzle client
│   │   └── schema.ts              # Drizzle schema
│   ├── cache.ts                   # Upstash Redis wrapper
│   ├── errors.ts                  # Error hierarchy
│   ├── rate-limiter.ts
│   └── circuit-breaker.ts
├── hooks/
│   ├── useCard.ts
│   ├── useDeck.ts
│   └── useCombos.ts
├── stores/
│   └── deckStore.ts               # Zustand store
├── types/
│   ├── card.ts
│   ├── deck.ts
│   └── combo.ts
├── python-service/                # Separate deployable
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── drizzle/
│   └── migrations/
├── public/
├── .env.local
├── .env.example
├── drizzle.config.ts
├── next.config.js
├── tailwind.config.ts
├── vercel.json
└── package.json
```

## API Contracts

### POST /api/decks/import

**Request:**
```json
{
  "moxfieldUrl": "https://www.moxfield.com/decks/abc123"
}
```

**Response (200):**
```json
{
  "id": "session_deck_uuid",
  "name": "Atraxa Superfriends",
  "format": "commander",
  "commander": {
    "name": "Atraxa, Praetors' Voice",
    "scryfallId": "...",
    "imageUri": "https://cards.scryfall.io/..."
  },
  "mainboard": [
    {
      "quantity": 1,
      "name": "Sol Ring",
      "scryfallId": "...",
      "imageUri": "...",
      "type": "Artifact",
      "manaCost": "{1}",
      "cmc": 1
    }
  ],
  "cardCount": 100,
  "importedAt": "2025-01-15T10:30:00Z"
}
```

### POST /api/cards/bulk

**Request:**
```json
{
  "cards": ["Sol Ring", "Mana Crypt", "Arcane Signet"]
}
```

**Response (200):**
```json
{
  "cards": [
    {
      "name": "Sol Ring",
      "scryfallId": "...",
      "oracleText": "Tap: Add {C}{C}.",
      "manaCost": "{1}",
      "images": {
        "normal": "https://cards.scryfall.io/normal/..."
      }
    }
  ],
  "notFound": [],
  "cached": 2,
  "fetched": 1
}
```

### POST /api/combos/check

**Request:**
```json
{
  "deckId": "session_deck_uuid",
  "cards": ["Sol Ring", "Basalt Monolith", "Rings of Brighthearth"]
}
```

**Response (200):**
```json
{
  "combos": [
    {
      "id": "combo_123",
      "cards": ["Basalt Monolith", "Rings of Brighthearth"],
      "description": "Infinite colorless mana",
      "steps": [
        "Tap Basalt Monolith for 3 colorless",
        "Pay 3 to untap, hold priority",
        "Pay 2 to copy untap ability with Rings",
        "Net +1 mana per iteration"
      ],
      "result": "Infinite colorless mana"
    }
  ],
  "potentialCombos": [
    {
      "cards": ["Basalt Monolith"],
      "missingPieces": ["Power Artifact"],
      "description": "Add this card for infinite mana"
    }
  ]
}
```

## Database Schema

### Core Tables

```sql
-- Card data cache (from Scryfall)
CREATE TABLE cards (
    id UUID PRIMARY KEY,              -- Scryfall UUID
    oracle_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    mana_cost VARCHAR(100),
    cmc DECIMAL(4,1),
    type_line VARCHAR(255),
    oracle_text TEXT,
    colors CHAR(1)[] DEFAULT '{}',
    color_identity CHAR(1)[] DEFAULT '{}',
    keywords TEXT[] DEFAULT '{}',
    legalities JSONB DEFAULT '{}',
    image_uris JSONB,
    prices JSONB,
    edhrec_rank INTEGER,
    cached_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session-based temporary storage
CREATE TABLE sessions (
    id VARCHAR(64) PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE session_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(64) REFERENCES sessions(id) ON DELETE CASCADE,
    moxfield_id VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    format VARCHAR(50) DEFAULT 'commander',
    commander_ids UUID[],
    imported_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE session_deck_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID REFERENCES session_decks(id) ON DELETE CASCADE,
    card_id UUID REFERENCES cards(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    board VARCHAR(20) DEFAULT 'mainboard'
);

-- Combo data (from EDHREC)
CREATE TABLE combos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edhrec_id VARCHAR(100) UNIQUE,
    name VARCHAR(255),
    description TEXT,
    result TEXT,
    color_identity CHAR(1)[] DEFAULT '{}',
    steps TEXT[] DEFAULT '{}',
    cached_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE combo_cards (
    combo_id UUID REFERENCES combos(id) ON DELETE CASCADE,
    oracle_id UUID NOT NULL,
    is_required BOOLEAN DEFAULT true,
    PRIMARY KEY (combo_id, oracle_id)
);

CREATE TABLE session_deck_combos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID REFERENCES session_decks(id) ON DELETE CASCADE,
    combo_id UUID REFERENCES combos(id),
    is_complete BOOLEAN DEFAULT false,
    missing_cards UUID[] DEFAULT '{}'
);

-- Future: User accounts
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    format VARCHAR(50) DEFAULT 'commander',
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Key Decisions

### 1. Separate Python Service vs Vercel Python Runtime
**Decision**: Separate Python service on Railway
**Rationale**: Vercel's Python runtime is experimental and has limitations. A dedicated FastAPI service provides better reliability, easier debugging, and can be independently scaled.

### 2. Session-Based Storage First
**Decision**: Start with temporary session storage, add user accounts later
**Rationale**: Reduces initial complexity, allows validating core functionality before adding auth. Clean migration path when users sign up.

### 3. Multi-Layer Caching Strategy
**Decision**: Redis (hot) -> PostgreSQL (warm) -> Scryfall API (cold)
**Rationale**: Card data rarely changes. Aggressive caching (24h+) respects Scryfall's rate limits while providing instant lookups.

### 4. Drizzle ORM over Prisma
**Decision**: Use Drizzle ORM
**Rationale**: Smaller bundle size (~50KB vs ~2MB), faster serverless cold starts, better raw SQL escape hatch, native Neon support.

### 5. Zustand + TanStack Query
**Decision**: Split state management between UI state (Zustand) and server state (TanStack Query)
**Rationale**: TanStack Query handles caching, refetching, and loading states for API data. Zustand handles ephemeral UI state without boilerplate.

### 6. Circuit Breaker Pattern
**Decision**: Implement circuit breakers for all external services
**Rationale**: Moxfield, Scryfall, and EDHREC can all fail independently. Circuit breakers prevent cascade failures and provide graceful degradation.

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...@neon.tech/decktutor

# Cache
UPSTASH_REDIS_URL=https://...upstash.io
UPSTASH_REDIS_TOKEN=...

# Python Service
PYTHON_SERVICE_URL=https://combo-api.railway.app

# External APIs (if keys required)
MOXFIELD_API_KEY=...  # If they require auth

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=...

# Auth (future)
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://decktutor.vercel.app
```

## Free Tier Limits to Monitor

| Service | Limit | Usage Estimate |
|---------|-------|----------------|
| **Vercel** | 100GB bandwidth/mo | ~50GB for 1K users |
| **Vercel** | 10s function timeout | Combo checks ~2-5s |
| **Railway** | $5 credit/mo | ~$3-4 for light usage |
| **Neon** | 0.5GB storage | ~100-200MB for MVP |
| **Upstash** | 10K commands/day | ~5K with caching |
| **Sentry** | 5K errors/mo | Should be well under |

## Development Setup

```bash
# Clone repository
git clone https://github.com/yourusername/decktutor.git
cd decktutor

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Fill in DATABASE_URL, UPSTASH_*, etc.

# Generate database
npm run db:generate
npm run db:push

# Run development servers
npm run dev              # Next.js on :3000
cd python-service && uvicorn main:app --reload  # FastAPI on :8000
```
