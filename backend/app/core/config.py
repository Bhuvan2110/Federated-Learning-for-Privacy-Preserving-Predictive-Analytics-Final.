import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Federated Learning Platform"
    # Supabase PostgreSQL — project: zjeabvqcjextrubfuntf
    # Set DATABASE_URL in your .env file (see .env for format)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres.zjeabvqcjextrubfuntf:YOUR_DB_PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
    )
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
