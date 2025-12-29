# Maria Knoop Gutachten Editor

Form-based editor for Restnutzungsdauer (remaining useful life) appraisals.

## Quick Start

```bash
# From platform root
pnpm install
pnpm --filter @exitace/maria-knoop-editor dev
```

Open http://localhost:3004

## Setup Required

### 1. Template DOCX

The template DOCX should be at:
```
data/temp/gnd/Luneburg_adj.docx
```

This is already in place if you followed the original setup.

### 2. OpenAI API Key (optional)

For AI-powered narrative generation, set in `.env.local`:
```
OPENAI_API_KEY=sk-...
```

Without the API key, the app uses mock narrative data.

## Architecture

**Form-based approach** (not PDF overlay):
- Clean form UI grouped by semantic sections
- DOCX template with text replacement on export
- Zustand state with localStorage persistence

**Why DOCX instead of PDF?**
- 1:1 fidelity - we use the original template, just replace text
- Easier to edit - form fields instead of pixel positioning
- Reliable - no coordinate mapping complexity

## Data Schema

The form captures all appraisal data:

| Section | Description |
|---------|-------------|
| Objekt | Property type, address |
| Termine | Valuation date, inspection date |
| Auftraggeber | Client information |
| Gebäude | Building characteristics |
| Berechnung | RND calculation, areas |
| Besichtigung | Inspection details |
| Beschreibungen | Narrative blocks (AI-generated) |
| Ausstattung | Equipment and features |

## File Structure

```
├── app/
│   ├── page.tsx                    # Main form page
│   └── api/
│       ├── export-gutachten/       # DOCX export with replacements
│       └── generate-narratives/    # LLM narrative generation
├── components/
│   ├── GutachtenForm.tsx           # Main form component
│   └── sections/
│       ├── FormField.tsx           # Reusable field components
│       ├── PropertySection.tsx     # Property info form
│       ├── DatesSection.tsx        # Date fields
│       ├── ClientSection.tsx       # Client info
│       ├── BuildingSection.tsx     # Building details
│       ├── CalculationSection.tsx  # RND calculation
│       ├── InspectionSection.tsx   # Inspection info
│       ├── NarrativesSection.tsx   # AI-generated text blocks
│       └── ComponentsSection.tsx   # Equipment/features
└── lib/
    ├── schema.ts                   # TypeScript data schema
    ├── store.ts                    # Zustand state management
    └── docx-replacements.ts        # Text replacement logic
```

## Usage

1. Fill out form fields by section
2. Click "Narrative generieren" for AI-generated text blocks
3. Review and edit narratives as needed
4. Click "PDF exportieren" to download the completed DOCX

## Export Flow

1. Load template DOCX (`Luneburg_adj.docx`)
2. Extract XML from DOCX (it's a ZIP)
3. Apply text replacements based on form data
4. Rebuild DOCX with modified content
5. Return as download

## Future: PDF Conversion

The export currently returns DOCX. For PDF conversion, options include:
- LibreOffice headless (local)
- CloudConvert API
- Microsoft Graph API
