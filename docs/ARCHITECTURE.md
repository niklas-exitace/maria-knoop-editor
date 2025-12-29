# Maria Knoop Editor - Architecture Overview

> **Last Updated:** 2025-12-27
> **Template Version:** Maria Knoop v2 (RND-Gutachten-Template_MariaKnoop_clean_v2)

---

## How It Works

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Form UI       │────▶│   Zustand Store  │────▶│  Export/Preview │
│   (React)       │     │   (GutachtenData)│     │  API Routes     │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
                                               ┌──────────────────────┐
                                               │  DOCX Template       │
                                               │  (gutachten-template │
                                               │   .docx)             │
                                               └──────────┬───────────┘
                                                          │
                                                          ▼
                                               ┌──────────────────────┐
                                               │  Placeholder         │
                                               │  Replacement Engine  │
                                               │  (docx-replacements) │
                                               └──────────┬───────────┘
                                                          │
                                                          ▼
                                               ┌──────────────────────┐
                                               │  Output DOCX/HTML    │
                                               └──────────────────────┘
```

---

## The Template System

### Three Placeholder Types

The Maria Knoop v2 template uses **three distinct placeholder patterns**, each with a specific purpose:

| Type | Pattern | Purpose | Example in Template |
|------|---------|---------|---------------------|
| **Double-curly** | `{{variable}}` | Machine-readable, snake_case keys | `{{client_name}}` |
| **Single-curly** | `{sample_value}` | Sample values to be replaced | `{David Eberlein}` |
| **Bracket blocks** | `[narrative...]` | Long text paragraphs | `[Die vertikale Erschließung...]` |

### Color Coding in Template (for human editors)

| Highlight | Meaning | Replacement Source |
|-----------|---------|-------------------|
| 🟡 Yellow | Simple ELB variables | Form fields |
| 🔵 Cyan | LLM-generated content / tables | Narratives section |
| 🔴 Red | Images / external content | Not implemented yet |

---

## File Structure

```
apps/labs/maria-knoop-editor/
├── app/
│   ├── page.tsx                          # Main page (renders GutachtenForm)
│   └── api/
│       ├── export-gutachten/route.ts     # DOCX export endpoint
│       ├── preview-gutachten/route.ts    # HTML preview endpoint
│       ├── generate-narratives/route.ts  # LLM narrative generation
│       └── test-case/route.ts            # Load sample data
├── components/
│   ├── GutachtenForm.tsx                 # Main form container
│   ├── DocumentPreview.tsx               # Live preview panel
│   └── sections/                         # Form section components
│       ├── PropertySection.tsx
│       ├── ClientSection.tsx
│       ├── DatesSection.tsx
│       ├── BuildingSection.tsx
│       ├── CalculationSection.tsx
│       ├── InspectionSection.tsx
│       ├── NarrativesSection.tsx
│       └── ComponentsSection.tsx
├── lib/
│   ├── schema.ts                         # TypeScript types + defaults
│   ├── store.ts                          # Zustand state management
│   ├── placeholder-map.ts                # Placeholder → data mappings
│   └── docx-replacements.ts              # Replacement engine
└── data/
    ├── template/
    │   ├── gutachten-template.docx       # Active template (v2 nopics)
    │   └── gutachten-template.manifest.json
    ├── RND-Gutachten-Template_MariaKnoop_clean_v2.docx      # Full with images
    ├── RND-Gutachten-Template_MariaKnoop_clean_v2-nopics.docx  # Dev version
    └── test-subowiak-merged.json         # Sample test case
```

---

## Data Flow

### 1. User Fills Form

```typescript
// components/sections/ClientSection.tsx
const updateField = useEditorStore((s) => s.updateField);

<input
  value={data.client.name}
  onChange={(e) => updateField('client', 'name', e.target.value)}
/>
```

### 2. Store Updates (Zustand)

```typescript
// lib/store.ts
export const useEditorStore = create<EditorStore>()(
  persist(
    (set) => ({
      data: DEFAULT_GUTACHTEN_DATA,
      updateField: (section, field, value) => {
        set((state) => ({
          data: {
            ...state.data,
            [section]: { ...state.data[section], [field]: value },
          },
        }));
      },
    }),
    { name: 'maria-knoop-editor-v2' }  // localStorage key
  )
);
```

### 3. Export Triggered

```typescript
// app/api/export-gutachten/route.ts
export async function POST(request: NextRequest) {
  const { data } = await request.json();

  // Load template
  const templateBuffer = fs.readFileSync('data/template/gutachten-template.docx');
  const zip = await JSZip.loadAsync(templateBuffer);

  // Apply replacements
  const documentXml = await zip.file('word/document.xml').async('string');
  const modifiedDocument = applyAllReplacements(documentXml, data);
  zip.file('word/document.xml', modifiedDocument);

  // Return DOCX
  return new NextResponse(await zip.generateAsync({ type: 'nodebuffer' }));
}
```

### 4. Replacement Engine

```typescript
// lib/docx-replacements.ts
export function applyAllReplacements(xml: string, data: GutachtenData): string {
  let result = xml;

  // Pass 1: {{variable}} placeholders
  result = replaceDoubleCurlyPlaceholders(result, data);

  // Pass 2: {sample_value} placeholders
  result = replaceSingleCurlyPlaceholders(result, createSingleCurlyMap(data));

  // Pass 3: [narrative block] placeholders
  result = replaceBracketBlocks(result, createBracketBlockMap(data));

  return result;
}
```

---

## Placeholder Mappings

### Double-Curly Placeholders (`lib/placeholder-map.ts`)

These are direct mappings from template variable names to data paths:

```typescript
export const DOUBLE_CURLY_MAP: Record<string, (data: GutachtenData) => string> = {
  client_name:         (d) => d.client.name,
  object_street:       (d) => d.property.street,
  object_zip:          (d) => d.property.zipCode,
  object_town:         (d) => d.property.city,
  object_appraise_date:(d) => d.dates.valuationDate,
  object_visit_date:   (d) => d.dates.inspectionDate,
};
```

**In template:** `{{client_name}}`
**Replaced with:** `data.client.name` → `"Tobias Subkowiak"`

### Single-Curly Placeholders

These map sample values from the template to actual data:

```typescript
export function createSingleCurlyMap(data: GutachtenData): Map<string, string> {
  const map = new Map<string, string>();

  // The template contains {David Eberlein} as a sample
  // We replace it with the actual client name
  map.set('David Eberlein', data.client.name);

  // Dates
  map.set('07.10.2025', data.dates.valuationDate);

  // Building year
  map.set('1964', String(data.building.yearBuilt));

  // RND values
  map.set('29 Jahre', `${data.calculation.restnutzungsdauerYears} Jahre`);
  map.set('80 J', `${data.calculation.gesamtnutzungsdauerYears} J`);

  // ... etc
  return map;
}
```

**In template:** `{David Eberlein}`
**Replaced with:** `data.client.name` → `"Tobias Subkowiak"`

### Bracket Block Placeholders

Long narrative text blocks:

```typescript
export function createBracketBlockMap(data: GutachtenData): Map<string, string> {
  const map = new Map<string, string>();

  map.set(
    'Treppenaufgang, 2 Wohn-/ Schlafräume sowie Küche und Badezimmer',
    data.inspection.areasVisited
  );

  map.set(
    'Die vertikale Erschließung aller Etagen des Gebäudes, erfolgt über das Treppenhaus. Ein Aufzug ist nicht vorhanden.',
    data.narratives.verticalAccess
  );

  // ... etc
  return map;
}
```

**In template:** `[Die vertikale Erschließung...]`
**Replaced with:** `data.narratives.verticalAccess`

---

## The DOCX Challenge

### Why This Is Tricky

DOCX files are ZIP archives containing XML. Word splits text **arbitrarily** across XML elements for formatting:

```xml
<!-- What we want to find: {{client_name}} -->
<!-- What Word actually stores: -->
<w:r><w:t>{{</w:t></w:r>
<w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>client_name</w:t></w:r>
<w:r><w:t>}}</w:t></w:r>
```

### Our Solution

The `replaceAcrossXmlElements()` function:

1. Extracts all `<w:t>` text nodes
2. Joins them into a combined string
3. Finds the placeholder in the combined string
4. Calculates which XML elements contain each part
5. Replaces across element boundaries

```typescript
function replaceAcrossXmlElements(xml: string, searchText: string, replacement: string): string {
  // Extract all <w:t> elements
  const segments = extractTextSegments(xml);

  // Build combined text: "{{client_name}}"
  const combinedText = segments.map(s => s.text).join('');

  // Find placeholder position
  const idx = combinedText.indexOf(searchText);

  // Map back to XML positions and replace
  // ... complex logic to handle cross-element replacements
}
```

---

## Data Schema

### GutachtenData Interface (`lib/schema.ts`)

```typescript
export interface GutachtenData {
  // Property info
  property: {
    unitType: string;      // "3-Zimmer-Wohnung"
    unitPosition: string;  // "3. OG rechts"
    street: string;        // "Daimlerstraße 4c"
    zipCode: string;       // "21337"
    city: string;          // "Lüneburg"
  };

  // Dates
  dates: {
    valuationDate: string;   // "07.10.2025"
    inspectionDate: string;  // "07.10.2025"
    reportDate: string;      // "03.11.2025"
  };

  // Client
  client: {
    name: string;  // "David Eberlein"
  };

  // Building
  building: {
    type: string;
    yearBuilt: number;
    floors: string;
    energyClass: string;
    aufzug: boolean;
    nutzungsart: 'wohnwirtschaftlich' | 'gewerblich' | 'gemischt';
    // ... more fields
  };

  // Calculation
  calculation: {
    restnutzungsdauerYears: number;   // RND
    gesamtnutzungsdauerYears: number; // GND
    standardStufe: string;
    grossFloorArea: string;
  };

  // Areas
  areas: {
    livingAreaM2: number;
    balconyAreaM2: number;
  };

  // Narratives (LLM-generated cyan blocks)
  narratives: {
    useDescription: string;
    verticalAccess: string;
    overallCondition: string;
    insulation: string;
    barrierFree: string;
    modernizationList: string;
    // ... more narrative fields
  };

  // Modernization matrix
  modernization: {
    roofRenewal: { points: number; weight: number };
    windowModernization: { points: number; weight: number };
    // ... 8 modernization categories
  };
}
```

---

## Current Limitations

### Not Yet Implemented

1. **Image placeholders (red)** - Template has placeholders for:
   - GoogleMaps location image
   - Property photos
   - Street sign photos

2. **Modernization table** - The points table in the template needs more precise cell-by-cell replacement

3. **PDF export** - Currently returns DOCX only. PDF conversion would need LibreOffice or external service.

4. **Full narrative generation** - LLM endpoint exists but needs proper prompting

### Known Issues

1. **Split placeholders** - Very complex XML splitting may still fail in edge cases
2. **Formatting loss** - Replaced text inherits surrounding formatting, which is usually correct but not always

---

## Adding New Placeholders

### Step 1: Add to Schema

```typescript
// lib/schema.ts
interface GutachtenData {
  mySection: {
    myNewField: string;
  };
}
```

### Step 2: Add to Placeholder Map

For double-curly (if template uses `{{my_new_field}}`):
```typescript
// lib/placeholder-map.ts
export const DOUBLE_CURLY_MAP = {
  // ...
  my_new_field: (d) => d.mySection.myNewField,
};
```

For single-curly (if template uses `{Sample Value}`):
```typescript
export function createSingleCurlyMap(data) {
  map.set('Sample Value', data.mySection.myNewField);
}
```

### Step 3: Add Form Field

```typescript
// components/sections/MySectionSection.tsx
<input
  value={data.mySection.myNewField}
  onChange={(e) => updateField('mySection', 'myNewField', e.target.value)}
/>
```

---

## Running the App

```bash
# From platform root
pnpm --filter @exitace/maria-knoop-editor dev

# Opens at http://localhost:3004
```

### Test Workflow

1. Open http://localhost:3004
2. Click "Testfall laden (Subowiak)" for sample data
3. Edit fields in the form
4. Watch preview update live
5. Click "DOCX exportieren" to download
6. Open in Word to verify replacements

---

## Files Reference

| File | Purpose |
|------|---------|
| `lib/schema.ts` | TypeScript types, defaults, form sections |
| `lib/store.ts` | Zustand state management |
| `lib/placeholder-map.ts` | Maps placeholders → data paths |
| `lib/docx-replacements.ts` | Core replacement engine |
| `data/template/gutachten-template.docx` | Active DOCX template |
| `data/template/gutachten-template.manifest.json` | Placeholder documentation |

---

*Architecture doc version: 1.0*
