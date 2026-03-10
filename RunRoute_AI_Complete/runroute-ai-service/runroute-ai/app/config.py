from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "RunRoute AI Service"
    debug: bool = False
    port: int = 8000

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"

    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = ""
    redis_ttl: int = 1800  # 30분

    # OSRM
    osrm_base_url: str = "http://router.project-osrm.org"

    # Google Maps
    google_maps_api_key: str = ""

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
