from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg2://cstrust:cstrust@127.0.0.1:5433/cstrust"
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 10080
    cors_origins: str = "http://localhost:5173"
    algorithm: str = "HS256"
    demo_otp: str = "123456"
    google_client_id: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
