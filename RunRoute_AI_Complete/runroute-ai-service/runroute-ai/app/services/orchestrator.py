import uuid
from typing import List
from app.models.schemas import (
    RecommendRequest, RecommendResponse, RouteResult,
    GeoJsonFeature, GeoJsonGeometry, ParsedParams
)
from app.services.nlp_parser import NLPParserService
from app.services.route_generator import RouteGeneratorService
from app.services.scoring import ScoringService


class RecommendationOrchestrator:
    """루트 추천 전체 파이프라인 조율"""

    def __init__(self):
        self.nlp = NLPParserService()
        self.generator = RouteGeneratorService()
        self.scorer = ScoringService()

    async def recommend(self, request: RecommendRequest) -> RecommendResponse:
        # ── Step 1: 자연어 파싱 ────────────────────────────────
        if request.natural_query:
            params = await self.nlp.parse(
                request.natural_query, request.lat, request.lng
            )
            # 명시적 파라미터가 있으면 파싱 결과 덮어씀
            if request.terrains:
                params.terrains = request.terrains
            if request.difficulty:
                params.difficulty = request.difficulty
        else:
            params = ParsedParams(
                distance_km=request.distance_km,
                terrains=request.terrains,
                difficulty=request.difficulty,
                tags=[],
                confidence=1.0,
            )

        # ── Step 2: 후보 루트 생성 ─────────────────────────────
        candidates = await self.generator.generate_candidates(
            request.lat, request.lng, params, num_candidates=5
        )

        # ── Step 3: 스코어링 ───────────────────────────────────
        scored = self.scorer.score_routes(
            candidates, params, request.user_history or []
        )

        # ── Step 4: Top 3 선택 및 응답 구성 ───────────────────
        top3 = scored[:3]
        candidate_map = {c.route_id: c for c in candidates}

        results: List[RouteResult] = []
        for score in top3:
            candidate = candidate_map.get(score.route_id)
            if not candidate:
                continue
            description = self.scorer.generate_route_description(candidate, params)
            results.append(
                RouteResult(
                    route_id=str(uuid.uuid4()),
                    geojson=GeoJsonFeature(
                        type="Feature",
                        geometry=GeoJsonGeometry(
                            type="LineString",
                            coordinates=candidate.geometry_coords,
                        ),
                        properties={"score": score.total_score},
                    ),
                    distance_km=round(candidate.distance_km, 2),
                    estimated_minutes=int(candidate.distance_km * 6),
                    elevation_gain_m=round(candidate.elevation_gain_m, 1),
                    safety_score=score.safety_score,
                    scenery_score=score.scenery_score,
                    total_score=score.total_score,
                    terrain_tags=candidate.terrain_tags,
                    pois=candidate.pois,
                    description=description,
                )
            )

        return RecommendResponse(
            routes=results,
            metadata={
                "parsed_query": params.model_dump() if request.natural_query else None,
                "candidates_generated": len(candidates),
                "location": {"lat": request.lat, "lng": request.lng},
            },
        )
