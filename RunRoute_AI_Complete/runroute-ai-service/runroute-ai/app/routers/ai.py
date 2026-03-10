from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    ParseRequest, ParsedParams,
    ScoreRequest, ScoreResponse,
    RecommendRequest, RecommendResponse,
)
from app.services.nlp_parser import NLPParserService
from app.services.scoring import ScoringService
from app.services.orchestrator import RecommendationOrchestrator

router = APIRouter(prefix="/ai", tags=["AI"])

nlp_service = NLPParserService()
scoring_service = ScoringService()
orchestrator = RecommendationOrchestrator()


@router.post("/parse", response_model=ParsedParams, summary="자연어 → 러닝 파라미터 변환")
async def parse_natural_query(request: ParseRequest):
    """사용자 자연어 입력을 구조화된 러닝 파라미터로 변환합니다.
    
    예: "강변으로 5km 가볍게" → {distance_km: 5, terrains: ["riverside"], difficulty: "easy"}
    """
    try:
        ctx = request.context or {}
        return await nlp_service.parse(
            request.natural_query,
            lat=ctx.get("lat", 37.5),
            lng=ctx.get("lng", 127.0),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파싱 실패: {str(e)}")


@router.post("/score", response_model=ScoreResponse, summary="루트 후보 스코어링")
async def score_routes(request: ScoreRequest):
    """루트 후보들에 다중 기준 스코어를 부여합니다."""
    try:
        scored = scoring_service.score_routes(
            request.routes, request.preferences, request.user_history or []
        )
        return ScoreResponse(scored_routes=scored)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"스코어링 실패: {str(e)}")


@router.post("/recommend", response_model=RecommendResponse, summary="통합 루트 추천")
async def recommend_routes(request: RecommendRequest):
    """자연어 파싱 → 루트 생성 → 스코어링 → Top 3 반환 전체 파이프라인"""
    try:
        return await orchestrator.recommend(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"추천 실패: {str(e)}")
