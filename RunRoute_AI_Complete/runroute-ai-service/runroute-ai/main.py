from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.routers.ai import router as ai_router
from app.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🤖 RunRoute AI Service 시작")
    yield
    print("🛑 RunRoute AI Service 종료")


settings = get_settings()

app = FastAPI(
    title="RunRoute AI Service",
    description="AI 기반 러닝 루트 추천 엔진 (NLP 파싱 + 루트 생성 + 스코어링)",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router)


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "service": "RunRoute AI"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.port, reload=settings.debug)
