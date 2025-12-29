# DeckTutor

MTG Deck Analysis & Combo Detection - Import your decks from Moxfield and discover powerful combos using EDHREC data.

## Features

- Import decks from Moxfield via URL
- View deck with card images from Scryfall
- Analyze deck statistics (mana curve, color distribution, type breakdown)
- Detect complete combos in your deck
- Find potential combos (cards you could add)
- Export decks back to Moxfield format

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **State**: Zustand + TanStack Query
- **Database**: Neon PostgreSQL + Drizzle ORM
- **Python Service**: FastAPI + pyedhrec (for EDHREC combo data)
- **Hosting**: Vercel (frontend) + Railway (Python service)

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+ (for combo service)
- Neon PostgreSQL database (free tier available)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/decktutor.git
cd decktutor
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your database credentials:
```
DATABASE_URL=postgresql://...@neon.tech/decktutor?sslmode=require
PYTHON_SERVICE_URL=http://localhost:8000
```

4. Set up the database:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

6. (Optional) Start the Python combo service:
```bash
cd python-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Visit http://localhost:3000 to see the app.

## Project Structure

```
decktutor/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # API routes
│   │   ├── deck/               # Deck pages
│   │   └── page.tsx            # Landing page
│   ├── components/             # React components
│   │   ├── card/               # Card display components
│   │   ├── deck/               # Deck management components
│   │   ├── layout/             # Header, Footer
│   │   └── ui/                 # shadcn/ui components
│   ├── lib/                    # Utilities and clients
│   │   ├── clients/            # API clients (Scryfall, Moxfield)
│   │   └── db/                 # Drizzle schema and client
│   ├── stores/                 # Zustand stores
│   └── types/                  # TypeScript types
├── python-service/             # Python FastAPI service
│   ├── main.py                 # FastAPI application
│   ├── requirements.txt
│   └── Dockerfile
└── CONTEXT.md                  # Detailed project documentation
```

## API Routes

- `POST /api/decks/import` - Import a deck from Moxfield
- `GET /api/cards/[name]` - Get card data from Scryfall
- `POST /api/cards/bulk` - Get multiple cards
- `GET /api/cards/autocomplete` - Card name autocomplete
- `POST /api/combos/check` - Check deck for combos
- `GET /api/health` - Health check

## Development

### Database Migrations

```bash
# Generate migration files
npm run db:generate

# Push schema to database
npm run db:push

# Open Drizzle Studio
npm run db:studio
```

### Type Checking

```bash
npx tsc --noEmit
```

## Deployment

### Vercel (Frontend)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

### Railway (Python Service)

1. Connect your GitHub repository to Railway
2. Point to the `python-service` directory
3. Add environment variables
4. Deploy

## License

MIT

## Credits

- Card data provided by [Scryfall](https://scryfall.com)
- Combo data from [EDHREC](https://edhrec.com)
- Not affiliated with Wizards of the Coast
# DeckTutor
