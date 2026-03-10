import json
import hashlib
import redis.asyncio as redis
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
from app.models.schemas import ParsedParams, TerrainType, Difficulty
from app.config import get_settings

SYSTEM_PROMPT = """당신은 러닝 루트 추천 앱의 자연어 파싱 전문가입니다.
사용자의 자연어 입력을 분석해 러닝 파라미터로 변환하세요.

규칙:
- 거리가 명시되지 않으면 5km로 기본값 설정
- "가볍게/천천히/산책" → easy, "보통/적당히" → moderate, "빠르게/고강도/훈련" → hard
- "공원/숲" → park, "강/한강/천" → riverside, "도심/시내/골목" → urban, "산/언덕" → mountain, "해변/바다" → beach
- confidence: 입력이 명확할수록 1에 가깝게

반드시 JSON 형식으로만 응답하세요. 예:
{{"distance_km": 5.0, "terrains": ["park"], "difficulty": "easy", "tags": ["scenic"], "confidence": 0.9}}
"""

USER_PROMPT = """사용자 입력: "{query}"
위치: 위도 {lat}, 경도 {lng}

JSON으로만 응답:"""


class NLPParserService:
    def __init__(self):
        settings = get_settings()
        self.llm = ChatOpenAI(
            model=settings.openai_model,
            api_key=settings.openai_api_key,
            temperature=0,
            max_tokens=200,
        )
        self.redis_client = None
        self._init_redis(settings)

    def _init_redis(self, settings):
        try:
            self.redis_client = redis.Redis(
                host=settings.redis_host,
                port=settings.redis_port,
                password=settings.redis_password or None,
                decode_responses=True,
            )
        except Exception:
            self.redis_client = None

    async def parse(self, query: str, lat: float = 37.5, lng: float = 127.0) -> ParsedParams:
        """자연어를 구조화된 러닝 파라미터로 변환"""
        # 캐시 확인
        cache_key = f"ai:parse:{hashlib.md5(query.encode()).hexdigest()}"
        if self.redis_client:
            try:
                cached = await self.redis_client.get(cache_key)
                if cached:
                    data = json.loads(cached)
                    return ParsedParams(**data, original_query=query)
            except Exception:
                pass

        # LLM 호출
        try:
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": USER_PROMPT.format(query=query, lat=lat, lng=lng)},
            ]
            response = await self.llm.ainvoke(messages)
            raw = response.content.strip()

            # JSON 파싱
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            data = json.loads(raw.strip())

            result = ParsedParams(
                distance_km=float(data.get("distance_km", 5.0)),
                terrains=[TerrainType(t) for t in data.get("terrains", []) if t in TerrainType._value2member_map_],
                difficulty=Difficulty(data.get("difficulty", "moderate")),
                tags=data.get("tags", []),
                confidence=float(data.get("confidence", 0.7)),
                original_query=query,
            )

            # 캐시 저장 (30분)
            if self.redis_client:
                try:
                    await self.redis_client.setex(
                        cache_key, 1800,
                        json.dumps(result.model_dump(exclude={"original_query"}))
                    )
                except Exception:
                    pass

            return result

        except Exception as e:
            # 파싱 실패 시 기본값 반환
            return self._fallback_parse(query)

    def _fallback_parse(self, query: str) -> ParsedParams:
        """LLM 실패 시 키워드 기반 폴백 파싱"""
        import re

        distance_km = 5.0
        dist_match = re.search(r"(\d+(?:\.\d+)?)\s*km", query, re.IGNORECASE)
        if dist_match:
            distance_km = float(dist_match.group(1))

        terrains = []
        terrain_keywords = {
            TerrainType.PARK: ["공원", "숲", "park"],
            TerrainType.RIVERSIDE: ["강변", "한강", "천", "강", "river"],
            TerrainType.URBAN: ["도심", "시내", "골목", "urban", "city"],
            TerrainType.MOUNTAIN: ["산", "언덕", "mountain", "hill"],
            TerrainType.BEACH: ["해변", "바다", "beach", "해수욕"],
        }
        for terrain, keywords in terrain_keywords.items():
            if any(kw in query for kw in keywords):
                terrains.append(terrain)

        difficulty = Difficulty.MODERATE
        if any(kw in query for kw in ["가볍게", "천천히", "산책", "easy"]):
            difficulty = Difficulty.EASY
        elif any(kw in query for kw in ["빠르게", "고강도", "훈련", "hard", "힘들게"]):
            difficulty = Difficulty.HARD

        return ParsedParams(
            distance_km=distance_km,
            terrains=terrains,
            difficulty=difficulty,
            tags=[],
            confidence=0.5,
            original_query=query,
        )
