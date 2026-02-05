"""
Database connection and session management.
Uses SQLAlchemy with GeoAlchemy2 for PostGIS support.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings

# Create engine with PostGIS support
engine = create_engine(
    settings.database_url,
    echo=settings.debug,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10
)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for models
Base = declarative_base()


def get_db():
    """
    Dependency for FastAPI routes.
    Yields a database session and ensures cleanup.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables."""
    from . import models  # Import models to register them
    from sqlalchemy import text
    
    # Enable PostGIS extension (required for geometry columns)
    with engine.connect() as conn:
        try:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
            conn.commit()
            print("PostGIS extension enabled successfully")
        except Exception as e:
            print(f"Note: Could not enable PostGIS extension: {e}")
    
    # Create tables. The checkfirst=True is implicitly used for tables,
    # but for PostgreSQL enums we need to handle them separately.
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        # If enum already exists, just log and continue
        if "already exists" in str(e) or "UniqueViolation" in str(e):
            print(f"Note: Some types already exist in database (this is normal): {e}")
            # Try again with tables only
            with engine.connect() as conn:
                # Tables should have checkfirst behavior
                for table in Base.metadata.sorted_tables:
                    if not engine.dialect.has_table(conn, table.name):
                        table.create(bind=engine)
        else:
            raise

