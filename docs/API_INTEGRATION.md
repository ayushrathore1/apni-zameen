# Land Record Digitization Assistant
## API Integration Guide

This document provides information for integrating with the Land Record Digitization Assistant API.

---

## API Version

**Current Version:** v1.0  
**Base URL:** `http://localhost:8000/api`

---

## Authentication

> **Note:** The MVP version does not require authentication. 
> Production deployments should implement JWT or API key authentication.

---

## Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| Read (GET) | 100 requests/minute |
| Write (POST/PATCH) | 30 requests/minute |
| Export | 10 requests/minute |

---

## Response Format

All endpoints return JSON with consistent structure:

```json
{
  "data": { ... },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0"
  }
}
```

### Error Response

```json
{
  "detail": "Error message",
  "error_code": "VALIDATION_ERROR"
}
```

---

## Core Endpoints

### Parcels

#### List Parcels
```http
GET /api/parcels?village_code=V001&page=1&page_size=50
```

#### Get Parcel GeoJSON
```http
GET /api/parcels/geojson?village_code=V001
```

Response: Standard GeoJSON FeatureCollection

#### Get Parcel by Plot ID
```http
GET /api/parcels/by-plot/{plot_id}
```

---

### Land Records

#### List Records
```http
GET /api/records?village_code=V001&current_only=true
```

#### Get Record by ID
```http
GET /api/records/{uuid}
```

#### Get Records for Plot
```http
GET /api/records/by-plot/{plot_id}?include_history=true
```

---

### Discrepancies

#### List Discrepancies
```http
GET /api/discrepancies?severity=critical&status=open&page=1
```

Parameters:
- `village_code`: Filter by village
- `severity`: critical | major | minor
- `status`: open | under_review | resolved | disputed | ignored
- `discrepancy_type`: area_mismatch | name_mismatch | missing_record | etc.

#### Get Priority Queue
```http
GET /api/priority/queue?village_code=V001&limit=50
```

Returns discrepancies sorted by intelligent priority score.

#### Run Detection
```http
POST /api/priority/detect?village_code=V001&recheck=false
```

---

### Search

#### Unified Search
```http
GET /api/search?q=रामेश&village_code=V001&limit=20
```

Searches both plot IDs and owner names (Hindi and English).

#### Autocomplete
```http
GET /api/search/autocomplete?q=V001&limit=10
```

---

### Workflow

#### Transition Status
```http
POST /api/workflow/transition/{discrepancy_id}
Content-Type: application/json

{
  "new_status": "under_review",
  "remarks": "Investigation started",
  "user_name": "operator1",
  "user_role": "operator"
}
```

#### Get Available Transitions
```http
GET /api/workflow/available-transitions/open?user_role=operator
```

---

### Data Export

#### Export Parcels (GeoJSON)
```http
GET /api/export/parcels/geojson?village_code=V001
```

#### Export Records (CSV)
```http
GET /api/export/records/csv?village_code=V001&current_only=true
```

#### Export Discrepancies (JSON)
```http
GET /api/export/discrepancies/json?status=open&severity=critical
```

---

## Webhooks (Future)

Planned webhook events:
- `discrepancy.created`
- `discrepancy.resolved`
- `record.updated`

---

## SDK Examples

### Python
```python
import requests

BASE_URL = "http://localhost:8000/api"

# Get parcels GeoJSON
response = requests.get(f"{BASE_URL}/parcels/geojson")
geojson = response.json()

# Search
response = requests.get(f"{BASE_URL}/search", params={"q": "रामेश"})
results = response.json()
```

### JavaScript
```javascript
const API_URL = 'http://localhost:8000/api';

// Get priority queue
const response = await fetch(`${API_URL}/priority/queue`);
const data = await response.json();

// Update status
await fetch(`${API_URL}/workflow/transition/${id}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    new_status: 'resolved',
    remarks: 'Fixed manually'
  })
});
```

---

## Support

- API Documentation: `/docs` (Swagger UI)
- ReDoc: `/redoc`
- Health Check: `GET /health`
