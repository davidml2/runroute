import pytest
from app.services.scoring import ScoringService
from app.services.nlp_parser import NLPParserService
from app.models.schemas import RouteCandidate, ParsedParams, TerrainType, Difficulty


class TestScoringService:
    def setup_method(self):
        self.scorer = ScoringService()
        self.params = ParsedParams(
            distance_km=5.0,
            terrains=[TerrainType.RIVERSIDE],
            difficulty=Difficulty.EASY,
            tags=[],
            confidence=0.9,
        )

    def test_distance_accuracy_exact(self):
        score = self.scorer._calc_distance_accuracy(5.0, 5.0)
        assert score == 100.0

    def test_distance_accuracy_10_percent_error(self):
        score = self.scorer._calc_distance_accuracy(5.5, 5.0)
        assert score == 80.0

    def test_distance_accuracy_50_percent_error(self):
        score = self.scorer._calc_distance_accuracy(7.5, 5.0)
        assert score == 0.0

    def test_elevation_score_within_range(self):
        # easy: 0-5 m/km, 거리 5km, 고도 15m → 3 m/km (범위 내)
        score = self.scorer._calc_elevation_score(15, 5.0, Difficulty.EASY)
        assert score == 100.0

    def test_scenery_terrain_bonus(self):
        candidate = RouteCandidate(
            route_id="test",
            distance_km=5.0,
            terrain_tags=["riverside"],
        )
        score = self.scorer._calc_scenery(candidate, self.params)
        assert score > 55  # 기본 55 + riverside 보너스 20

    def test_score_routes_sorted_by_total(self):
        candidates = [
            RouteCandidate(route_id="a", distance_km=5.0, terrain_tags=["riverside"]),
            RouteCandidate(route_id="b", distance_km=8.0, terrain_tags=[]),
            RouteCandidate(route_id="c", distance_km=4.9, terrain_tags=["riverside"]),
        ]
        results = self.scorer.score_routes(candidates, self.params)
        # 결과가 내림차순 정렬인지 확인
        scores = [r.total_score for r in results]
        assert scores == sorted(scores, reverse=True)

    def test_generate_description(self):
        candidate = RouteCandidate(
            route_id="test",
            distance_km=5.2,
            terrain_tags=["riverside"],
            elevation_gain_m=10,
        )
        desc = self.scorer.generate_route_description(candidate, self.params)
        assert "5.2km" in desc
        assert "강변" in desc


class TestNLPParserFallback:
    def setup_method(self):
        self.parser = NLPParserService()

    def test_fallback_distance_extraction(self):
        result = self.parser._fallback_parse("한강 따라 10km 뛰고 싶어")
        assert result.distance_km == 10.0

    def test_fallback_terrain_detection(self):
        result = self.parser._fallback_parse("공원 위주로 뛰고 싶어")
        assert TerrainType.PARK in result.terrains

    def test_fallback_difficulty_easy(self):
        result = self.parser._fallback_parse("가볍게 산책하듯 뛰고 싶어")
        assert result.difficulty == Difficulty.EASY

    def test_fallback_difficulty_hard(self):
        result = self.parser._fallback_parse("고강도 훈련 루트 추천해줘")
        assert result.difficulty == Difficulty.HARD
