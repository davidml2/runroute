from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class TerrainType(str, Enum):
    PARK = "park"
    RIVERSIDE = "riverside"
    URBAN = "urban"
    MOUNTAIN = "mountain"
    BEACH = "beach"


class Difficulty(str, Enum):
    EASY = "easy"
    MODERATE = "moderate"
    HARD = "hard"


# ── 자연어 파싱 ──────────────────────────────────────────────
class ParseRequest(BaseModel):
    natural_query: str = Field(..., example="강변 따라 5km 가볍게 뛰고 싶어")
    context: Optional[dict] = Field(None, example={"lat": 37.5665, "lng": 126.9780})


class ParsedParams(BaseModel):
    distance_km: float = Field(..., ge=1, le=100)
    terrains: List[TerrainType] = []
    difficulty: Difficulty = Difficulty.MODERATE
    tags: List[str] = []
    confidence: float = Field(..., ge=0, le=1)
    original_query: str = ""


# ── 루트 스코어링 ──────────────────────────────────────────
class RouteCandidate(BaseModel):
    route_id: str
    distance_km: float
    elevation_gain_m: float = 0
    terrain_tags: List[str] = []
    safety_data: Optional[dict] = None
    pois: List[dict] = []
    geometry_coords: List[List[float]] = []  # [[lng, lat], ...]


class ScoreRequest(BaseModel):
    routes: List[RouteCandidate]
    preferences: ParsedParams
    user_history: Optional[List[dict]] = []


class ScoredRoute(BaseModel):
    route_id: str
    total_score: float
    safety_score: float
    scenery_score: float
    distance_accuracy: float
    elevation_score: float
    personalization_score: float


class ScoreResponse(BaseModel):
    scored_routes: List[ScoredRoute]


# ── 통합 추천 ──────────────────────────────────────────────
class RecommendRequest(BaseModel):
    lat: float
    lng: float
    distance_km: float = Field(..., ge=1, le=100)
    terrains: List[TerrainType] = []
    difficulty: Difficulty = Difficulty.MODERATE
    natural_query: Optional[str] = None
    user_history: Optional[List[dict]] = []


class GeoJsonGeometry(BaseModel):
    type: str = "LineString"
    coordinates: List[List[float]]


class GeoJsonFeature(BaseModel):
    type: str = "Feature"
    geometry: GeoJsonGeometry
    properties: dict = {}


class RouteResult(BaseModel):
    route_id: str
    geojson: GeoJsonFeature
    distance_km: float
    estimated_minutes: int
    elevation_gain_m: float
    safety_score: float
    scenery_score: float
    total_score: float
    terrain_tags: List[str]
    pois: List[dict] = []
    description: str = ""


class RecommendResponse(BaseModel):
    routes: List[RouteResult]
    metadata: dict
