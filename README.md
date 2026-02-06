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
```
Activate the venv (use one that matches your shell):
- **Git Bash / WSL**: `source venv/Scripts/activate`
- **Windows CMD**: `venv\Scripts\activate.bat`
- **PowerShell**: `.\venv\Scripts\Activate.ps1`
- **Linux / Mac**: `source venv/bin/activate`

Then install and init (with venv activated):
```bash
pip install -r requirements.txt
python scripts/init_db.py
python scripts/load_sample_data.py
```
Start the server:
- **Windows CMD (easiest):** From `backend` run `start.bat` (creates venv, installs deps, then starts the server).
- **Otherwise:** With venv activated, run `python run.py`.
- From repo root in Git Bash: `bash backend/run.sh`.

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
