# Land Record Digitization Assistant
## User Guide / उपयोगकर्ता मार्गदर्शिका

---

## Quick Start / त्वरित प्रारंभ

### 1. Starting the System / सिस्टम शुरू करना

1. Start the database:
   ```bash
   docker-compose up -d
   ```

2. Start the backend:
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload
   ```

3. Open the frontend:
   - Open `frontend/index.html` in your browser
   - Or serve via local server on port 3000

---

## Features / विशेषताएं

### Map View / मानचित्र दृश्य

![Map View](map_view.png)

The map shows all land parcels color-coded by discrepancy severity:
- 🟢 **Green** - No issues
- 🟡 **Yellow** - Minor issues
- 🟠 **Orange** - Major issues
- 🔴 **Red** - Critical issues

**Actions / कार्रवाई:**
- Click any parcel to see details
- Use the village filter to focus on specific areas
- Search by plot ID or owner name

---

### Dashboard / डैशबोर्ड

The dashboard provides:

| Metric | Description | विवरण |
|--------|-------------|--------|
| Total | All open discrepancies | सभी खुली विसंगतियां |
| Critical | Urgent attention needed | तत्काल ध्यान आवश्यक |
| Major | Significant issues | महत्वपूर्ण मुद्दे |
| Minor | Small variations | छोटी भिन्नताएं |

**Running Detection / जांच चलाना:**
1. Click "Run Detection" button
2. Wait for analysis to complete
3. Review newly found discrepancies

---

### Search / खोज

Search supports both Hindi and English:

| Search Type | Example | उदाहरण |
|-------------|---------|--------|
| Plot ID | V001/1/123 | V001/1/123 |
| Owner (English) | Ramesh Kumar | Ramesh Kumar |
| Owner (Hindi) | रामेश कुमार | रामेश कुमार |

---

## Discrepancy Types / विसंगति प्रकार

| Type | Description | विवरण |
|------|-------------|--------|
| Area Mismatch | Map vs record area differs | नक्शे और रिकॉर्ड में क्षेत्रफल अलग |
| Name Mismatch | Owner names don't match | मालिक के नाम मेल नहीं खाते |
| Missing Record | Parcel without ownership | स्वामित्व रिकॉर्ड गायब |
| Missing Parcel | Record without map data | नक्शा डेटा गायब |
| Duplicate | Multiple records for same plot | एक प्लॉट के कई रिकॉर्ड |

---

## Status Workflow / स्थिति कार्यप्रवाह

```
Open → Under Review → Resolved
         ↓
      Disputed → Resolved
```

| Status | Meaning | अर्थ |
|--------|---------|------|
| Open | Newly detected | नई पहचान |
| Under Review | Being investigated | जांच जारी |
| Resolved | Issue fixed | समस्या हल |
| Disputed | Under discussion | विवाद में |
| Ignored | Not an issue | मुद्दा नहीं |

---

## Keyboard Shortcuts / कीबोर्ड शॉर्टकट

| Key | Action | कार्रवाई |
|-----|--------|---------|
| `/` | Focus search | खोज पर जाएं |
| `1` | Map view | मानचित्र |
| `2` | Dashboard | डैशबोर्ड |
| `Esc` | Close popup | पॉपअप बंद |

---

## Getting Help / सहायता

- Technical Issues: Contact IT Support
- Data Questions: Contact Land Records Office
- Feature Requests: Submit to Project Team
