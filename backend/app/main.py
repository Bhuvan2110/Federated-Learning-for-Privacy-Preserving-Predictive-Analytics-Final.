"""
FastAPI application entry point.
"""
import mlflow
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import get_settings
from app.api import auth, datasets, training, predict, metrics, metrics_exporter

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: configure MLflow
    try:
        mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
        mlflow.set_experiment("fl-platform")
    except Exception:
        pass
    yield
    # Shutdown: nothing needed


app = FastAPI(
    title="FL Platform API",
    description="Federated Learning for Privacy-Preserving Predictive Analytics",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Security Headers Middleware ───────────────────────────────────────────────
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    if settings.environment == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"
        )
    return response

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(datasets.router)
app.include_router(training.router)
app.include_router(predict.router)
app.include_router(metrics.router)
app.include_router(metrics_exporter.router)


@app.get("/")
async def root():
    return {
        "message": "FL Platform API",
        "version": "1.0.0",
        "docs": "/docs",
        "algorithms": ["fedavg", "fedprox", "scaffold", "dpsgd", "central"],
    }


@app.get("/health")
async def health():
    return {"status": "ok", "environment": settings.environment}
