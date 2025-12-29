"""
DeckTutor Combo Detection Service

This service uses pyedhrec to fetch combo data from EDHREC
and analyze decks for potential combos.
"""

import os
import time
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="DeckTutor Combo API",
    description="EDHREC combo detection service for DeckTutor",
    version="1.0.0",
)

# CORS configuration
allowed_origins = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class ComboCard(BaseModel):
    name: str
    is_required: bool = True


class Combo(BaseModel):
    id: str
    name: Optional[str] = None
    cards: list[str]
    description: str
    prerequisite: Optional[str] = None
    steps: list[str]
    result: str
    color_identity: list[str] = []
    source_url: Optional[str] = None


class DeckCombo(BaseModel):
    combo: Combo
    is_complete: bool
    present_cards: list[str]
    missing_cards: list[str]


class PotentialCombo(BaseModel):
    cards: list[str]
    missing_pieces: list[str]
    description: str


class ComboRequest(BaseModel):
    cards: list[str]
    commander: Optional[str] = None


class ComboResponse(BaseModel):
    combos: list[DeckCombo]
    potential_combos: list[PotentialCombo]
    analyzed_cards: int
    processing_time: int


# Simple in-memory cache for combo data
combo_cache: dict[str, list[dict]] = {}
CACHE_TTL = 3600  # 1 hour


def get_card_combos_cached(card_name: str) -> list[dict]:
    """Get combos for a card with caching."""
    cache_key = card_name.lower()

    if cache_key in combo_cache:
        return combo_cache[cache_key]

    try:
        # Try to import pyedhrec
        from pyedhrec import EDHRec

        edhrec = EDHRec()
        combos = edhrec.get_card_combos(card_name)
        combo_cache[cache_key] = combos if combos else []
        return combo_cache[cache_key]
    except ImportError:
        # pyedhrec not installed, return mock data for development
        return []
    except Exception as e:
        print(f"Error fetching combos for {card_name}: {e}")
        return []


def find_combos_in_deck(card_names: list[str]) -> tuple[list[DeckCombo], list[PotentialCombo]]:
    """
    Find complete and potential combos in a deck.

    Returns:
        - Complete combos: All required cards are present
        - Potential combos: Some cards present, some missing
    """
    deck_cards = set(c.lower() for c in card_names)
    found_combos: dict[str, DeckCombo] = {}
    potential_combos: dict[str, PotentialCombo] = {}

    for card_name in card_names:
        card_combos = get_card_combos_cached(card_name)

        for combo_data in card_combos:
            combo_id = combo_data.get("id", str(hash(str(combo_data))))
            combo_cards = [c.lower() for c in combo_data.get("cards", [])]

            if not combo_cards:
                continue

            # Check which combo cards are in the deck
            present = [c for c in combo_cards if c in deck_cards]
            missing = [c for c in combo_cards if c not in deck_cards]

            if len(present) < 2:
                # Need at least 2 cards to be interesting
                continue

            if not missing:
                # Complete combo
                if combo_id not in found_combos:
                    found_combos[combo_id] = DeckCombo(
                        combo=Combo(
                            id=combo_id,
                            name=combo_data.get("name"),
                            cards=combo_data.get("cards", []),
                            description=combo_data.get("description", ""),
                            prerequisite=combo_data.get("prerequisite"),
                            steps=combo_data.get("steps", []),
                            result=combo_data.get("result", ""),
                            color_identity=combo_data.get("colorIdentity", []),
                            source_url=combo_data.get("sourceUrl"),
                        ),
                        is_complete=True,
                        present_cards=present,
                        missing_cards=[],
                    )
            else:
                # Potential combo
                if combo_id not in potential_combos and combo_id not in found_combos:
                    potential_combos[combo_id] = PotentialCombo(
                        cards=present,
                        missing_pieces=missing,
                        description=combo_data.get("result", combo_data.get("description", "Unknown combo")),
                    )

    return list(found_combos.values()), list(potential_combos.values())


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "combo-api",
        "version": "1.0.0",
    }


@app.get("/ready")
async def readiness_check():
    """Readiness check - verify pyedhrec is available."""
    try:
        from pyedhrec import EDHRec
        edhrec_available = True
    except ImportError:
        edhrec_available = False

    return {
        "ready": True,
        "checks": {
            "pyedhrec": edhrec_available,
        },
    }


@app.post("/combos", response_model=ComboResponse)
async def check_combos(request: ComboRequest):
    """
    Check a deck for known EDHREC combos.

    Args:
        request: The deck cards to analyze

    Returns:
        Complete and potential combos found in the deck
    """
    if not request.cards:
        raise HTTPException(status_code=400, detail="No cards provided")

    if len(request.cards) > 200:
        raise HTTPException(status_code=400, detail="Too many cards (max 200)")

    start_time = time.time()

    try:
        complete_combos, potential = find_combos_in_deck(request.cards)

        processing_time = int((time.time() - start_time) * 1000)

        return ComboResponse(
            combos=complete_combos,
            potential_combos=potential[:20],  # Limit to top 20 potential
            analyzed_cards=len(request.cards),
            processing_time=processing_time,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
