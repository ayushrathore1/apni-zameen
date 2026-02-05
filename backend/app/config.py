"""
Application configuration using Pydantic Settings.
Loads from environment variables and .env file.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment."""
    
    # Database
    database_url: str = "postgresql://land_user:land_pass_2024@localhost:5432/land_records"
    
    # Application
    app_name: str = "Land Record Digitization Assistant"
    debug: bool = True
    secret_key: str = "dev-secret-key-change-in-production"
    
    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # Discrepancy Detection Thresholds
    area_tolerance_minor: float = 5.0  # percentage
    area_tolerance_major: float = 15.0  # percentage
    name_similarity_threshold: int = 80  # 0-100 score
    
    # Villages
    supported_villages: str = "V001,V002,V003,V004,V005"
    
    @property
    def village_list(self) -> List[str]:
        """Parse supported villages as list."""
        return [v.strip() for v in self.supported_villages.split(",")]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()


settings = get_settings()
