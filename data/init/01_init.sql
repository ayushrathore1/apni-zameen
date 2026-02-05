-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For fuzzy text search

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE land_records TO land_user;
