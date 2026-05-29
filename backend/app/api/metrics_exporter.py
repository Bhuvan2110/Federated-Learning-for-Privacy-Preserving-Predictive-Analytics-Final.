from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
from prometheus_client import generate_latest, REGISTRY, Counter, Histogram

router = APIRouter()

REQUEST_COUNT = Counter("api_requests_total", "Total API requests")
REQUEST_TIME = Histogram("api_request_duration_seconds", "API request duration")

@router.get("/metrics")
def get_metrics():
    REQUEST_COUNT.inc()
    return PlainTextResponse(generate_latest(REGISTRY), media_type="text/plain")
