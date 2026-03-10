import math
from typing import List, Dict
import numpy as np
from app.models.schemas import (
    RouteCandidate, ParsedParams, ScoredRoute, Difficulty, TerrainType
)

# 스코어링 가중치 (PRD 5.6 기준)
WEIGHTS = {
    "safety":          0.30,
    "scenery":         0.25,
    "distance_acc":    0.35,
    "elevation":       0.20,
    "personalization": 0.10,
}

# 난이도별 선호 고도 상승 (m/km)
DIFFICULTY_ELEVATION = {
    Difficulty.EASY:     (0, 5),
    Difficulty.MODERATE: (5, 15),
    Difficulty.HARD:     (15, 50),
}

# 지형 태그별 기본 경관 점수
TERRAIN_SCENERY_BONUS = {
    TerrainType.RIVERSIDE: 20,
    TerrainType.PARK:      15,
    TerrainType.MOUNTAIN:  18,
    TerrainType.BEACH:     22,
    TerrainType.URBAN:     5,
}


class ScoringService:
    """루트 후보에 다중 기준 스코어를 부여하는 서비스"""

    def score_routes(
        self,
        candidates: List[RouteCandidate],
        params: ParsedParams,
        user_history: List[dict] = [],
    ) -> List[ScoredRoute]:
        scored = [self._score_one(c, params, user_history) for c in candidates]
        # 총점 내림차순 정렬
        return sorted(scored, key=lambda s: s.total_score, reverse=True)

    def _score_one(
        self,
        candidate: RouteCandidate,
        params: ParsedParams,
        user_history: List[dict],
    ) -> ScoredRoute:
        safety      = self._calc_safety(candidate)
        scenery     = self._calc_scenery(candidate, params)
        dist_acc    = self._calc_distance_accuracy(candidate.distance_km, params.distance_km)
        elevation   = self._calc_elevation_score(candidate.elevation_gain_m, candidate.distance_km, params.difficulty)
        personal    = self._calc_personalization(candidate, params, user_history)

        total = (
            safety      * WEIGHTS["safety"] +
            scenery     * WEIGHTS["scenery"] +
            dist_acc    * WEIGHTS["distance_acc"] +
            elevation   * WEIGHTS["elevation"] +
            personal    * WEIGHTS["personalization"]
        )

        return ScoredRoute(
            route_id=candidate.route_id,
            total_score=round(total, 2),
            safety_score=round(safety, 2),
            scenery_score=round(scenery, 2),
            distance_accuracy=round(dist_acc, 2),
            elevation_score=round(elevation, 2),
            personalization_score=round(personal, 2),
        )

    def _calc_safety(self, candidate: RouteCandidate) -> float:
        """안전도 점수 (0-100)
        실제 구현: 공공 범죄 데이터 API, 가로등 DB, 인도 여부 연동
        현재: 기본 70점 + 지형/거리 보정"""
        base = 70.0
        # 도심 루트는 안전도 보너스
        if "urban" in candidate.terrain_tags:
            base += 10
        # 길이가 짧을수록 안전 (야간 고려)
        if candidate.distance_km < 5:
            base += 5
        return min(100.0, max(0.0, base))

    def _calc_scenery(self, candidate: RouteCandidate, params: ParsedParams) -> float:
        """경관 점수 (0-100)
        실제 구현: Google Places API, 사진 수, 사용자 리뷰 반영
        현재: 지형 선호 매칭 기반"""
        base = 55.0

        # 선호 지형과 매칭 시 보너스
        for terrain in params.terrains:
            if terrain.value in candidate.terrain_tags:
                base += TERRAIN_SCENERY_BONUS.get(terrain, 0)

        # POI가 많을수록 경관 점수 상승
        poi_bonus = min(15, len(candidate.pois) * 3)
        base += poi_bonus

        return min(100.0, max(0.0, base))

    def _calc_distance_accuracy(self, actual_km: float, target_km: float) -> float:
        """목표 거리 정확도 (0-100)"""
        if target_km == 0:
            return 50.0
        error_ratio = abs(actual_km - target_km) / target_km
        # 오차 10% 이내 = 100점, 50% 이상 = 0점
        score = max(0.0, 100.0 - error_ratio * 200)
        return score

    def _calc_elevation_score(
        self, elevation_gain_m: float, distance_km: float, difficulty: Difficulty
    ) -> float:
        """목표 난이도 대비 고도 쾌적도 (0-100)"""
        if distance_km == 0:
            return 50.0

        gain_per_km = elevation_gain_m / distance_km
        low, high = DIFFICULTY_ELEVATION[difficulty]

        if low <= gain_per_km <= high:
            return 100.0
        elif gain_per_km < low:
            # 목표보다 완만
            diff = low - gain_per_km
            return max(0.0, 100.0 - diff * 5)
        else:
            # 목표보다 가파름
            diff = gain_per_km - high
            return max(0.0, 100.0 - diff * 3)

    def _calc_personalization(
        self,
        candidate: RouteCandidate,
        params: ParsedParams,
        user_history: List[dict],
    ) -> float:
        """개인화 점수: 과거 러닝 기록 기반 협업 필터링
        실제 구현: 사용자 과거 평가 데이터 기반 ML 모델
        현재: 과거 선호 지형 일치도 기반"""
        if not user_history:
            return 50.0

        # 과거 5회 기록에서 선호 지형 추출
        past_terrains: Dict[str, int] = {}
        for record in user_history[-5:]:
            for tag in record.get("terrain_tags", []):
                past_terrains[tag] = past_terrains.get(tag, 0) + 1

        if not past_terrains:
            return 50.0

        # 현재 후보 지형과 과거 선호 매칭
        matches = sum(past_terrains.get(tag, 0) for tag in candidate.terrain_tags)
        max_possible = sum(past_terrains.values())
        if max_possible == 0:
            return 50.0

        return min(100.0, 50.0 + (matches / max_possible) * 50)

    def generate_route_description(self, route: RouteCandidate, params: ParsedParams) -> str:
        """루트 설명 자동 생성"""
        terrain_names = {"park": "공원", "riverside": "강변", "urban": "도심",
                        "mountain": "산길", "beach": "해변"}
        terrain_str = ", ".join([terrain_names.get(t, t) for t in route.terrain_tags])
        diff_names = {"easy": "쉬운", "moderate": "보통", "hard": "어려운"}
        diff_str = diff_names.get(params.difficulty.value, "보통")

        parts = [f"{route.distance_km:.1f}km {diff_str} 코스"]
        if terrain_str:
            parts.append(f"{terrain_str} 위주")
        if route.elevation_gain_m > 20:
            parts.append(f"고도 {route.elevation_gain_m:.0f}m 상승")
        if route.pois:
            parts.append(f"주요 포인트 {len(route.pois)}곳")

        return " · ".join(parts)
