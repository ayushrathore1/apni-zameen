# Deployment Guide: Render (Backend) + Vercel (Frontend)

Complete guide for deploying the Land Records Digitization Assistant.

---

## Prerequisites

- GitHub account with repository access
- [Render](https://render.com) account (free tier available)
- [Vercel](https://vercel.com) account (free tier available)
- PostgreSQL database (Render provides free tier)

---

## Part 1: Database Setup (Render PostgreSQL)

### 1.1 Create PostgreSQL Database

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **PostgreSQL**
3. Configure:
   - **Name**: `land-records-db`
   - **Database**: `land_records`
   - **User**: `land_records_user`
   - **Region**: Singapore (closest to India)
   - **Plan**: Free (or Starter for production)
4. Click **Create Database**
5. Copy the **External Database URL** (starts with `postgresql://...`)

---

## Part 2: Backend Deployment (Render Web Service)

### 2.1 Prepare Backend

Add these files to `backend/` if not present:

**`backend/requirements.txt`** (ensure all dependencies):
```
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.25
psycopg2-binary==2.9.9
python-dotenv==1.0.0
pydantic==2.5.3
alembic==1.13.1
geoalchemy2==0.14.3
shapely==2.0.2
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
httpx==0.26.0
```

**`backend/render.yaml`**:
```yaml
services:
  - type: web
    name: land-records-api
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: land-records-db
          property: connectionString
      - key: PYTHON_VERSION
        value: 3.11.0
```

### 2.2 Deploy Backend

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `land-records-api`
   - **Root Directory**: `backend`
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add Environment Variables:
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | (your PostgreSQL URL from step 1.1) |
   | `SECRET_KEY` | (generate with `openssl rand -hex 32`) |
   | `ENVIRONMENT` | `production` |
   | `CORS_ORIGINS` | `https://your-frontend.vercel.app` |
6. Click **Create Web Service**

### 2.3 Initialize Database

After deployment, run migrations:

```bash
# In Render Shell (or local with DATABASE_URL set)
alembic upgrade head
python -m app.scripts.seed_data  # If you have seed script
```

---

## Part 3: Frontend Deployment (Vercel)

### 3.1 Prepare Frontend

**`frontend-react/.env.production`**:
```env
VITE_API_URL=https://land-records-api.onrender.com/api
2026-02-05T20:29:26.627333081Z   File "/opt/render/project/src/backend/app/api/auth.py", line 29, in <module>
2026-02-05T20:29:26.627335151Z     class UserCreate(BaseModel):
2026-02-05T20:29:26.627337181Z     ...<5 lines>...
2026-02-05T20:29:26.627339401Z         designation: Optional[str] = None
2026-02-05T20:29:26.627344941Z   File "/opt/render/project/src/.venv/lib/python3.13/site-packages/pydantic/_internal/_model_construction.py", line 255, in __new__
2026-02-05T20:29:26.627347081Z     complete_model_class(
2026-02-05T20:29:26.627349112Z     ~~~~~~~~~~~~~~~~~~~~^
2026-02-05T20:29:26.627351092Z         cls,
2026-02-05T20:29:26.627353221Z         ^^^^
2026-02-05T20:29:26.627355252Z     ...<3 lines>...
2026-02-05T20:29:26.627357421Z         create_model_module=_create_model_module,
2026-02-05T20:29:26.627359512Z         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
2026-02-05T20:29:26.627361562Z     )
2026-02-05T20:29:26.627363572Z     ^
2026-02-05T20:29:26.627365722Z   File "/opt/render/project/src/.venv/lib/python3.13/site-packages/pydantic/_internal/_model_construction.py", line 648, in complete_model_class
2026-02-05T20:29:26.627367782Z     schema = gen_schema.generate_schema(cls)
2026-02-05T20:29:26.627369772Z   File "/opt/render/project/src/.venv/lib/python3.13/site-packages/pydantic/_internal/_generate_schema.py", line 729, in generate_schema
2026-02-05T20:29:26.627371802Z     schema = self._generate_schema_inner(obj)
2026-02-05T20:29:26.627373852Z   File "/opt/render/project/src/.venv/lib/python3.13/site-packages/pydantic/_internal/_generate_schema.py", line 1023, in _generate_schema_inner
2026-02-05T20:29:26.627376072Z     return self._model_schema(obj)
2026-02-05T20:29:26.627382572Z            ~~~~~~~~~~~~~~~~~~^^^^^
2026-02-05T20:29:26.627384932Z   File "/opt/render/project/src/.venv/lib/python3.13/site-packages/pydantic/_internal/_generate_schema.py", line 856, in _model_schema
2026-02-05T20:29:26.627387232Z     {k: self._generate_md_field_schema(k, v, decorators) for k, v in fields.items()},
2026-02-05T20:29:26.627389342Z         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^
2026-02-05T20:29:26.627392042Z   File "/opt/render/project/src/.venv/lib/python3.13/site-packages/pydantic/_internal/_generate_schema.py", line 1228, in _generate_md_field_schema
2026-02-05T20:29:26.627394102Z     schema, metadata = self._common_field_schema(name, field_info, decorators)
2026-02-05T20:29:26.627396333Z                        ~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
2026-02-05T20:29:26.627398482Z   File "/opt/render/project/src/.venv/lib/python3.13/site-packages/pydantic/_internal/_generate_schema.py", line 1282, in _common_field_schema
2026-02-05T20:29:26.627400582Z     schema = self._apply_annotations(
2026-02-05T20:29:26.627402653Z         source_type,
2026-02-05T20:29:26.627404843Z         annotations + validators_from_decorators,
2026-02-05T20:29:26.627407043Z     )
2026-02-05T20:29:26.627409143Z   File "/opt/render/project/src/.venv/lib/python3.13/site-packages/pydantic/_internal/_generate_schema.py", line 2227, in _apply_annotations
2026-02-05T20:29:26.627411353Z     schema = get_inner_schema(source_type)
2026-02-05T20:29:26.627413443Z   File "/opt/render/project/src/.venv/lib/python3.13/site-packages/pydantic/_internal/_schema_generation_shared.py", line 83, in __call__
2026-02-05T20:29:26.627415713Z     schema = self._handler(source_type)
2026-02-05T20:29:26.627417863Z   File "/opt/render/project/src/.venv/lib/python3.13/site-packages/pydantic/_internal/_generate_schema.py", line 2203, in inner_handler
2026-02-05T20:29:26.627420043Z     schema = self._generate_schema_from_get_schema_method(obj, source_type)
2026-02-05T20:29:26.627429053Z   File "/opt/render/project/src/.venv/lib/python3.13/site-packages/pydantic/_internal/_generate_schema.py", line 919, in _generate_schema_from_get_schema_method
2026-02-05T20:29:26.627431363Z     schema = get_schema(
2026-02-05T20:29:26.627433513Z         source, CallbackGetCoreSchemaHandler(self._generate_schema_inner, self, ref_mode=ref_mode)
2026-02-05T20:29:26.627435613Z     )
2026-02-05T20:29:26.627437983Z   File "/opt/render/project/src/.venv/lib/python3.13/site-packages/pydantic/networks.py", line 1005, in __get_pydantic_core_schema__
2026-02-05T20:29:26.627440053Z     import_email_validator()
2026-02-05T20:29:26.627442053Z     ~~~~~~~~~~~~~~~~~~~~~~^^
2026-02-05T20:29:26.627444143Z   File "/opt/render/project/src/.venv/lib/python3.13/site-packages/pydantic/networks.py", line 967, in import_email_validator
2026-02-05T20:29:26.627446303Z     raise ImportError("email-validator is not installed, run `pip install 'pydantic[email]'`") from e
2026-02-05T20:29:26.627448394Z ImportError: email-validator is not installed, run `pip install 'pydantic[email]'`
2026-02-05T20:29:31.509460826Z ==> No open ports detected, continuing to scan...
2026-02-05T20:29:31.920214529Z ==> Docs on specifying a port: https://render.com/docs/web-services#port-binding
2026-02-05T20:29:43.020754245Z ==> Exited with status 1
2026-02-05T20:29:43.023316261Z ==> Common ways to troubleshoot your deploy: https://render.com/docs/troubleshooting-deploys
2026-02-05T20:29:48.540547646Z ==> Running 'uvicorn app.main:app --host 0.0.0.0 --port $PORT'=Land Records Assistant
```

**`frontend-react/vercel.json`**:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

### 3.2 Deploy Frontend

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend-react`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add Environment Variables:
   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://land-records-api.onrender.com/api` |
6. Click **Deploy**

### 3.3 Update CORS on Backend

After getting your Vercel URL, update CORS on Render:

1. Go to Render Dashboard → land-records-api → Environment
2. Update `CORS_ORIGINS`: `https://your-app.vercel.app`
3. Redeploy

---

## Part 4: Post-Deployment Checklist

### 4.1 Verify Services

- [ ] Backend health check: `https://land-records-api.onrender.com/health`
- [ ] Frontend loads: `https://your-app.vercel.app`
- [ ] API connection: Check browser console for errors
- [ ] Map tiles load (ESRI/OSM are free, no API key needed)
- [ ] Database connection: Test search functionality

### 4.2 Load GeoJSON Data

If database is empty, load parcel data:

```bash
# Option 1: Via Render Shell
python -m app.scripts.load_geojson

# Option 2: Via API (if endpoint exists)
curl -X POST https://land-records-api.onrender.com/api/admin/load-data \
  -H "Authorization: Bearer <admin-token>"
```

### 4.3 Custom Domain (Optional)

**Vercel:**
1. Settings → Domains → Add Domain
2. Configure DNS: `CNAME` to `cname.vercel-dns.com`

**Render:**
1. Settings → Custom Domains → Add Domain
2. Configure DNS as instructed

---

## Environment Variables Summary

### Backend (Render)
| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@host/db` |
| `SECRET_KEY` | JWT signing key | `abc123...` (32+ chars) |
| `ENVIRONMENT` | Environment name | `production` |
| `CORS_ORIGINS` | Allowed origins | `https://app.vercel.app` |

### Frontend (Vercel)
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://api.onrender.com/api` |

---

## Troubleshooting

### Backend Issues
- **502 Bad Gateway**: Check Render logs, ensure `uvicorn` is starting correctly
- **Database connection failed**: Verify `DATABASE_URL` format
- **CORS errors**: Update `CORS_ORIGINS` to include frontend URL

### Frontend Issues
- **API calls failing**: Check `VITE_API_URL` in environment variables
- **Blank page**: Check browser console for JavaScript errors
- **Map not loading**: Tile URLs are free, check network tab for 403/404

### Performance Tips
- Render free tier sleeps after 15 min inactivity (first request takes ~30s)
- Use Render Starter ($7/mo) for production to avoid cold starts
- Vercel free tier is sufficient for most use cases

---

## Quick Commands

```bash
# Build frontend locally
cd frontend-react && npm run build

# Test backend locally with production DB
DATABASE_URL="postgresql://..." uvicorn app.main:app --reload

# Generate production secret key
openssl rand -hex 32
```

---

## Support

- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- FastAPI Deployment: https://fastapi.tiangolo.com/deployment/
