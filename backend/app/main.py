import time
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import OperationalError

from app.db.session import engine, Base, SessionLocal, _is_sqlite
from app.db.models import User
from app.core.security import get_password_hash
from app.api import datasets, training, auth, predict, metrics, metrics_exporter


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles startup and shutdown events using the modern lifespan pattern."""
    # --- STARTUP ---
    db = SessionLocal()
    max_retries = 10
    for i in range(max_retries):
        try:
            Base.metadata.create_all(bind=engine)
            break
        except OperationalError:
            if i < max_retries - 1:
                print(f"DB not ready, retrying ({i+1}/{max_retries})...")
                time.sleep(3)
            else:
                db.close()
                raise

    try:
        admin_email = "sbhuvan847@gmail.com"
        admin_user = db.query(User).filter(User.email == admin_email).first()
        if not admin_user:
            hashed_password = get_password_hash("SuperAdmin123!")
            new_admin = User(
                email=admin_email,
                hashed_password=hashed_password,
                role="Super Admin"
            )
            db.add(new_admin)
            db.commit()
            print("Super Admin seeded successfully.")
    finally:
        db.close()

    # --- SAFE MIGRATION: PostgreSQL-only DDL (SQLite gets schema via create_all) ---
    if not _is_sqlite:
        try:
            with engine.connect() as conn:
                conn.execute(
                    __import__("sqlalchemy").text(
                        "ALTER TABLE datasets ADD COLUMN IF NOT EXISTS csv_content TEXT"
                    )
                )
                conn.execute(
                    __import__("sqlalchemy").text(
                        "ALTER TABLE datasets ALTER COLUMN filepath DROP NOT NULL"
                    )
                )
                conn.commit()
            print("Migration: csv_content column ensured on datasets table.")
        except Exception as mig_err:
            print(f"Migration note: {mig_err}")

    yield  # Application runs here

    # --- SHUTDOWN (optional cleanup) ---
    print("Federated Learning Platform shutting down.")


app = FastAPI(title="Federated Learning Platform API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(datasets.router, prefix="/api/datasets", tags=["datasets"])
app.include_router(training.router, prefix="/api/training", tags=["training"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(predict.router, prefix="/api/predict", tags=["predict"])
app.include_router(metrics.router, prefix="/api/metrics", tags=["/metrics"])
app.include_router(metrics_exporter.router, tags=["prometheus"])


@app.get("/")
def read_root():
    return {"message": "Welcome to the Federated Learning Platform API"}

