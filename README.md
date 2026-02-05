# Land Record Digitization Assistant

A local-deployable web system to link spatial land parcel maps with textual ownership records, detect discrepancies automatically, and support auditable correction workflows.

## Quick Start

### Prerequisites
- Python 3.11+
- Docker Desktop

### 1. Start Database
```bash
docker-compose up -d
```

### 2. Setup Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
python scripts/init_db.py
python scripts/load_sample_data.py
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Open Frontend
Open `frontend/index.html` in your browser, or serve via:
```bash
cd frontend
python -m http.server 3000
```

## Project Structure
```
├── backend/          # FastAPI backend
├── frontend/         # HTML/CSS/JS frontend
├── data/             # Sample and synthetic data
├── docs/             # Documentation
├── scripts/          # Utility scripts
└── docker-compose.yml
```

## Features
- 🗺️ Interactive map with land parcels
- 🔍 Search by Plot ID or Owner Name (Hindi/English)
- ⚠️ Automatic discrepancy detection
- 📊 Discrepancy dashboard with filters
- 📝 Audit trail for all changes

## License
Internal use only.
