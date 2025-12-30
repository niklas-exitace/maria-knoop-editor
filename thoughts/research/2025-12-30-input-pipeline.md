# Research: Maria Knoop Input JSON Pipeline

**Date:** 2025-12-30
**Topic:** How input data flows into the Gutachten editor

---

## Overview

The Maria Knoop editor receives input via a `GutachtenData` JSON structure. This document traces how that data is created and loaded.

---

## Pipeline Architecture

```
┌─────────────────┐     ┌──────────────────┐
│  Pipedrive CRM  │     │  Besichtigung    │
│  (Export CSV)   │     │  (Inspection)    │
└────────┬────────┘     └────────┬─────────┘
         │                       │
         │  PipedriveRow         │  BesichtigungData
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   gutachten-merger    │
         │   mergeToGutachtenData│
         └───────────┬───────────┘
                     │
                     │  GutachtenData
                     ▼
         ┌───────────────────────┐
         │   JSON File / API     │
         │   /api/test-case      │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   Zustand Store       │
         │   loadCase()          │
         └───────────┬───────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   GutachtenForm       │
         │   (Editor UI)         │
         └───────────────────────┘
```

---

## Data Sources

### 1. Pipedrive CRM Export (`PipedriveRow`)

The CRM export provides deal metadata:

| Field | Example | Purpose |
|-------|---------|---------|
| `Kontaktperson` | "Tobias Subkowiak" | Client name |
| `Objektadresse` | "Piepenstockplatz 5\n44263 Dortmund" | Property address |
| `Baujahr` | 1955 | Year built |
| `Fläche (m²)` | 49 | Area in sqm |
| `RND` | 23 | Remaining useful life |
| `Gebäudetyp` | "Einzelne Eigentumswohnung" | Building type |
| `Anzahl Einheiten` | 8 | Number of units |
| `Bewertungsstichtag (final)` | "2024-01-01" | Valuation date |
| `Gutachten_ID` | "md634w8h-ec1264" | Report ID |
| `Dach (Punkte)` | 0 | Modernization points |
| `Fenster (Punkte)` | 1 | Modernization points |
| ... | ... | (8 modernization categories) |
| `Bauweise` | "Massivbausweise" | Construction type |
| `Dachkonstruktion` | "Satteldach" | Roof construction |
| ... | ... | (8 Baudetails categories) |

### 2. Besichtigung Data (`BesichtigungData`)

Inspection data from site visits:

```typescript
interface BesichtigungData {
  aktenzeichen: string;           // File reference
  inspektionsDatum: string;       // Inspection date
  inspektionsZeit: string;        // Inspection time
  sachverstaendiger: string;      // Expert name
  objektadresse: string;          // Property address
  objektart: string;              // Property type
  objektlage: string;             // Location description
  objektmerkmale: string;         // Property characteristics
  einheit: {
    name: string;                 // Unit name (e.g., "3. OG links")
    lage: string;                 // Location within building
    wohnflaeche: number;          // Living area
    komponenten: Component[];     // Room components
    besonderheiten: string;       // Special features
    zustand: string;              // Condition
  };
}
```

---

## Merger Function

**File:** `lib/gutachten-merger.ts`

```typescript
export function mergeToGutachtenData(
  pipedrive: PipedriveRow,
  besichtigung: BesichtigungData,
  images?: ImageData[]
): GutachtenData
```

The merger:
1. Extracts metadata from Pipedrive (client, address, dates, IDs)
2. Maps modernization points (8 categories) from Pipedrive
3. Maps Baudetails (construction details) from Pipedrive
4. Integrates inspection findings from Besichtigung
5. Combines everything into `GutachtenData`

---

## Test Case Pipeline

For the embedded test case, the pipeline was:

1. **Script:** `scripts/test-merge-subowiak.ts`
2. **Input:** Pipedrive row (hardcoded) + Besichtigung JSON from `gutachten-generator/data/parsed-simple/contract-58984.json`
3. **Output:** `data/test-subowiak-merged.json`

```bash
npx tsx scripts/test-merge-subowiak.ts
```

---

## Loading Data into Editor

### API Endpoint

**File:** `app/api/test-case/route.ts`

```typescript
export async function GET() {
  const testCasePath = path.join(process.cwd(), 'data', 'test-subowiak-merged.json');
  const data = JSON.parse(fs.readFileSync(testCasePath, 'utf-8'));
  return NextResponse.json(data);
}
```

### Store

**File:** `lib/store.ts`

```typescript
loadCase: (data: GutachtenData) => set({ gutachten: data })
```

The form component fetches from `/api/test-case` and calls `store.loadCase()`.

---

## Production Pipeline (Future)

For production, the flow would be:

1. **Pipedrive Webhook/Export** → automated extraction
2. **Besichtigung App** → inspection data via API
3. **Backend Merger** → automatic merge on deal update
4. **API Endpoint** → serve merged data by `gutachten_id`
5. **Editor** → load via URL param: `/editor?case=md634w8h-ec1264`

---

## Key Files

| File | Purpose |
|------|---------|
| `lib/gutachten-merger.ts` | Merge logic + interfaces |
| `scripts/test-merge-subowiak.ts` | Test data generation script |
| `data/test-subowiak-merged.json` | Current test case |
| `app/api/test-case/route.ts` | API serving test case |
| `lib/store.ts` | Zustand state + loadCase |
| `app/page.tsx` | Main editor page |

---

## Summary

The input JSON pipeline has 3 stages:

1. **Data Collection:** Pipedrive (CRM) + Besichtigung (Inspection)
2. **Data Merge:** `gutachten-merger.ts` combines both into `GutachtenData`
3. **Data Loading:** API endpoint → Zustand store → Editor form

Currently uses a static test case (`test-subowiak-merged.json`). Production would replace the API endpoint with a dynamic backend query.
