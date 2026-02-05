# Land Record Digitization Assistant
## Technical Documentation

### Overview
This document provides technical details for developers working on the Land Record Digitization Assistant system.

---

## Architecture

### System Components

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│   FastAPI       │────▶│   PostgreSQL    │
│  (HTML/JS/CSS)  │     │   Backend       │     │   + PostGIS     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Services Layer     │
                    │  - Name Matching    │
                    │  - Area Tolerance   │
                    │  - Discrepancy      │
                    │  - Audit/Workflow   │
                    └─────────────────────┘
```

### Database Schema

| Table | Purpose |
|-------|---------|
| `parcels` | Spatial polygons with PostGIS geometry |
| `land_records` | Ownership records with versioning |
| `discrepancies` | Detected issues with status workflow |
| `change_logs` | Immutable audit trail |

---

## API Reference

### Base URL
```
http://localhost:8000/api
```

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/parcels` | List all parcels |
| GET | `/parcels/geojson` | Get parcels as GeoJSON |
| GET | `/parcels/{id}` | Get single parcel |
| GET | `/records` | List land records |
| GET | `/records/{id}` | Get single record |
| GET | `/discrepancies` | List discrepancies |
| POST | `/discrepancies/detect` | Run detection |
| GET | `/search?q=` | Unified search |

### Priority Queue (Advanced)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/priority/queue` | Get prioritized discrepancies |
| POST | `/priority/detect` | Enhanced detection with scoring |
| GET | `/priority/summary` | Dashboard statistics |

### Workflow Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/workflow/transition/{id}` | Change status |
| GET | `/workflow/history/{type}/{id}` | Get audit history |
| GET | `/workflow/stats` | Status counts |

---

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Application
APP_NAME="Land Record Assistant"
DEBUG=false
API_PREFIX=/api

# Thresholds
AREA_TOLERANCE_MINOR=5.0
AREA_TOLERANCE_MAJOR=10.0
NAME_SIMILARITY_THRESHOLD=80.0
```

---

## Services

### Name Matching (`advanced_name_matching.py`)
- Hindi-English transliteration support
- Phonetic key generation
- Levenshtein similarity scoring
- Father name correlation

### Severity Scoring (`severity_scoring.py`)
- Multi-factor scoring (0-100)
- Area mismatch weighting
- Name similarity impact
- Historical pattern analysis

### Workflow (`workflow_service.py`)
- State machine for status transitions
- Role-based permission checks
- Bulk transition support

---

## Running Tests

```bash
cd backend
python -m pytest tests/ -v
```

## Backup

```bash
cd backend
python scripts/backup_database.py
```

Backups are saved to `data/backups/{timestamp}/` with:
- `database.sql` - Full SQL dump
- `parcels.geojson` - Spatial data
- `land_records.csv` - Tabular records
- `discrepancies.json` - Issues list
- `audit_log.json` - Change history
