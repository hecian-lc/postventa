from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    app_name: str = "PostVenta System"
    secret_key: str = "cambia-esta-clave-secreta-en-produccion"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 8

    database_url: str = "sqlite:///./postventa.db"
    frontend_url: str = "http://localhost:5173"

    ai_provider: str = "claude"
    anthropic_api_key: Optional[str] = None
    google_api_key: Optional[str] = None

    class Config:
        env_file = ".env"


settings = Settings()
