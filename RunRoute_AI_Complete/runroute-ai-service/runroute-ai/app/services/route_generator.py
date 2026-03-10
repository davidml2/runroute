import math
import httpx
from typing import List, Tuple
from app.models.schemas import RouteCandidate, ParsedParams, TerrainType
from app.config import get_settings

# 방향별 오프셋 (루프 루트를 위한 중간 경유지 방향)
ROUTE_DIRECTIONS = [
    {"name": "north_east", "dlat": 0.7, "dlng": 0.7},
    {"name": "south_west", "dlat": -0.7, "dlng": -0.5},
    {"name": "north_west", "dlat": 0.5, "dlng": -0.8},
    {"name": "south_east", "dlat": -0.4, "dlng": 0.9},
    {"name": "north",      "dlat": 1.0, "dlng": 0.0},
]


class RouteGeneratorService:
    def __init__(self):
        self.settings = get_settings()

    async def generate_candidates(
        self,
        lat: float,
        lng: float,
        params: ParsedParams,
        num_candidates: int = 5,
    ) -> List[RouteCandidate]:
        """출발점 기준 다방향 루프 루트 후보 생성"""
        radius_m = self._estimate_radius(params.distance_km)
        candidates = []

        async with httpx.AsyncClient(timeout=10.0) as client:
            for i, direction in enumerate(ROUTE_DIRECTIONS[:num_candidates]):
                try:
                    route = await self._generate_loop_route(
                        client, lat, lng, radius_m, direction
                    )
                    if route:
                        candidate = RouteCandidate(
                            route_id=f"candidate_{i}",
                            distance_km=route["distance"] / 1000,
                            elevation_gain_m=self._estimate_elevation(route),
                            terrain_tags=self._detect_terrain_tags(params.terrains),
                            geometry_coords=route.get("geometry", {}).get("coordinates", []),
                            pois=[],
                        )
                        candidates.append(candidate)
                except Exception:
                    continue

        # 후보가 없으면 더미 루트 생성
        if not candidates:
            candidates = self._generate_fallback_routes(lat, lng, params.distance_km)

        return candidates

    async def _generate_loop_route(
        self,
        client: httpx.AsyncClient,
        lat: float,
        lng: float,
        radius_m: float,
        direction: dict,
    ) -> dict | None:
        """OSRM을 이용한 루프 루트 생성 (출발 → 중간 경유지 → 복귀)"""
        # 중간 경유지 계산
        mid_lat = lat + (direction["dlat"] * radius_m / 111000)
        mid_lng = lng + (direction["dlng"] * radius_m / (111000 * math.cos(math.radians(lat))))

        # 1/4 지점과 3/4 지점 경유지 추가로 더 자연스러운 루프 구성
        q1_lat = lat + (direction["dlat"] * radius_m * 0.4 / 111000)
        q1_lng = lng + (direction["dlng"] * radius_m * 0.4 / (111000 * math.cos(math.radians(lat))))
        q3_lat = lat + (direction["dlat"] * radius_m * 0.4 / 111000)
        q3_lng = lng - (direction["dlng"] * radius_m * 0.4 / (111000 * math.cos(math.radians(lat))))

        coords = f"{lng},{lat};{q1_lng},{q1_lat};{mid_lng},{mid_lat};{q3_lng},{q3_lat};{lng},{lat}"
        url = f"{self.settings.osrm_base_url}/route/v1/foot/{coords}"
        params = {"overview": "full", "geometries": "geojson", "steps": "false"}

        response = await client.get(url, params=params)
        data = response.json()

        if data.get("code") == "Ok" and data.get("routes"):
            return data["routes"][0]
        return None

    def _estimate_radius(self, distance_km: float) -> float:
        """목표 거리에서 루프 반경 추정 (원 둘레 공식 역산)"""
        return (distance_km * 1000) / (2 * math.pi) * 0.85

    def _estimate_elevation(self, route: dict) -> float:
        """루트 거리 기반 고도 추정 (실제 DEM 데이터 없는 경우)"""
        distance_km = route.get("distance", 0) / 1000
        return distance_km * 3  # 평균 3m/km 고도 상승 추정

    def _detect_terrain_tags(self, preferred_terrains: List[TerrainType]) -> List[str]:
        return [t.value for t in preferred_terrains]

    def _generate_fallback_routes(
        self, lat: float, lng: float, distance_km: float
    ) -> List[RouteCandidate]:
        """OSRM 연결 실패 시 기하학적 루트 생성"""
        radius = self._estimate_radius(distance_km)
        routes = []
        for i in range(3):
            angle_offset = i * 120  # 120도 간격
            coords = self._circle_route(lat, lng, radius, angle_offset, points=20)
            routes.append(
                RouteCandidate(
                    route_id=f"fallback_{i}",
                    distance_km=distance_km * (0.95 + i * 0.05),
                    elevation_gain_m=distance_km * 3,
                    terrain_tags=[],
                    geometry_coords=coords,
                    pois=[],
                )
            )
        return routes

    def _circle_route(
        self, lat: float, lng: float, radius_m: float, offset_deg: float, points: int
    ) -> List[List[float]]:
        coords = []
        for i in range(points + 1):
            angle = math.radians(offset_deg + (360 / points) * i)
            dlat = (radius_m * math.sin(angle)) / 111000
            dlng = (radius_m * math.cos(angle)) / (111000 * math.cos(math.radians(lat)))
            coords.append([lng + dlng, lat + dlat])
        return coords
