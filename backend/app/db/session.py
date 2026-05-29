from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Supabase requires SSL. The pooler (port 6543) uses transaction mode
# which works well with SQLAlchemy's connection pool.
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"sslmode": "require"},
    pool_pre_ping=True,      # detects stale connections before use
    pool_size=5,
    max_overflow=10,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
