# DeckTutor Combo API

Python FastAPI service for EDHREC combo detection.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Copy environment file:
```bash
cp .env.example .env
```

4. Run the service:
```bash
uvicorn main:app --reload
```

The service will be available at http://localhost:8000

## API Endpoints

- `GET /health` - Health check
- `GET /ready` - Readiness check (verifies pyedhrec is available)
- `POST /combos` - Check a deck for combos

### POST /combos

Request:
```json
{
  "cards": ["Sol Ring", "Basalt Monolith", "Rings of Brighthearth"],
  "commander": "Kinnan, Bonder Prodigy"
}
```

Response:
```json
{
  "combos": [
    {
      "combo": {
        "id": "combo_123",
        "cards": ["Basalt Monolith", "Rings of Brighthearth"],
        "description": "Infinite colorless mana",
        "steps": ["..."],
        "result": "Infinite colorless mana"
      },
      "is_complete": true,
      "present_cards": ["basalt monolith", "rings of brighthearth"],
      "missing_cards": []
    }
  ],
  "potential_combos": [],
  "analyzed_cards": 3,
  "processing_time": 245
}
```

## Deployment

### Railway

1. Connect your GitHub repository
2. Railway will auto-detect the Dockerfile
3. Set environment variables in Railway dashboard

### Docker

```bash
docker build -t decktutor-combo-api .
docker run -p 8000:8000 -e ALLOWED_ORIGINS=http://localhost:3000 decktutor-combo-api
```
