"""
FastAPI Application Entry Point.
Land Record Digitization Assistant API.
"""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from .config import settings
from .database import init_db
from .api import parcels_router, records_router, discrepancies_router, search_router
from .api.priority import router as priority_router
from .api.workflow import router as workflow_router
from .api.exports import router as exports_router
from .api.auth import router as auth_router
from .api.upload import router as upload_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown."""
    try:
        # Run sync DB init in a thread to avoid blocking the event loop
        await asyncio.to_thread(init_db)
        print("Database initialized successfully")
    except Exception as e:
        print(f"DB init skipped (app can still serve file-based data): {e}")
    yield
    # Shutdown


app = FastAPI(
    title=settings.app_name,
    description="""
    Land Record Digitization Assistant API.
    
    A system to link spatial land parcel maps with textual ownership records,
    automatically detect discrepancies, and support auditable correction workflows.
    
    ## Features
    - 🗺️ Spatial parcel queries with GeoJSON support
    - 🔍 Search by Plot ID or Owner Name (Hindi/English)
    - ⚠️ Automatic discrepancy detection
    - 📊 Dashboard statistics and filtering
    - 🔐 JWT Authentication for officials
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api")
app.include_router(parcels_router, prefix="/api")
app.include_router(records_router, prefix="/api")
app.include_router(discrepancies_router, prefix="/api")
app.include_router(search_router, prefix="/api")
app.include_router(priority_router, prefix="/api")
app.include_router(workflow_router, prefix="/api")
app.include_router(exports_router, prefix="/api")
app.include_router(upload_router, prefix="/api")


@app.get("/", tags=["Health"])
async def root():
    """Root endpoint - API info."""
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "api_prefix": "/api"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.get("/api/villages", tags=["Reference"])
async def list_villages():
    """List supported villages. Always returns 200 with at least default list."""
    try:
        codes = getattr(settings, "village_list", None)
        if not isinstance(codes, list):
            codes = ["V001", "V002", "V003", "V004", "V005"]
        return {
            "villages": [{"code": str(c), "name": f"Village {c}"} for c in codes]
        }
    except Exception:
        return {"villages": [{"code": "V001", "name": "Village V001"}, {"code": "V002", "name": "Village V002"}]}


# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler."""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.debug else "An error occurred"
        }
    )
