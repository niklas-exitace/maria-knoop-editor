# Gutachten Input Schema Plan

## Data Sources

| Source | What it provides | Format |
|--------|------------------|--------|
| **Pipedrive** | Client, property basics, modernization status, RND result | JSON (8120 cases) |
| **Besichtigung PDF** | Inspection details, component conditions, location assessment | PDF → parsed JSON |
| **Images** | Property photos for document | JPG files in contract folders |

## Field Mapping: Source → Template

### 1. Property Info (`property`)

| Template Field | Source | Notes |
|----------------|--------|-------|
| `unitType` | Manual / Pipedrive `gebaeudetyp` | "3-Zimmer-Wohnung" etc. |
| `unitPosition` | Besichtigung `einheit.lage` | "3. OG links" |
| `street` | Pipedrive OR Besichtigung | Both have address |
| `zipCode` | Pipedrive OR Besichtigung | |
| `city` | Pipedrive OR Besichtigung | |

### 2. Dates (`dates`)

| Template Field | Source | Notes |
|----------------|--------|-------|
| `valuationDate` | Pipedrive `bewertung.stichtag` | Wertermittlungsstichtag |
| `inspectionDate` | Besichtigung `inspektionsDatum` | From PDF |
| `reportDate` | Generated | Today or manual |

### 3. Client (`client`)

| Template Field | Source | Notes |
|----------------|--------|-------|
| `name` | Pipedrive `kunde.name` | |

### 4. Building (`building`)

| Template Field | Source | Notes |
|----------------|--------|-------|
| `type` | Pipedrive `gebaeudetyp` + Besichtigung `objektmerkmale.wohneinheiten` | "MFH mit X Wohnungen" |
| `yearBuilt` | Pipedrive `objekt.baujahr` OR Besichtigung `einheit.baujahr` | |
| `floors` | Besichtigung `objektmerkmale.vollgeschosse` | "UG - 3. OG" |
| `atticInfo` | Besichtigung (from PDF header) | "DG nicht ausgebaut" |
| `foundation` | Manual | Not in Besichtigung |
| `exteriorWalls` | Besichtigung component `Fassade.erlaeuterung` | |
| `roof` | Besichtigung component `Dächer.erlaeuterung` | |
| `windows` | Besichtigung `objektmerkmale.fenster` OR component | |
| `heating` | Besichtigung component `Heizung.erlaeuterung` | |
| `energyClass` | Manual | Not in sources |

### 5. Calculation (`calculation`)

| Template Field | Source | Notes |
|----------------|--------|-------|
| `restnutzungsdauerYears` | Pipedrive `ergebnis.restnutzungsdauer` | The main output! |
| `gesamtnutzungsdauerYears` | Pipedrive `ergebnis.gesamtnutzungsdauer` | Usually 80 |
| `standardStufe` | Manual / derived | "ImmoWertV - Stufe 2 bis 3" |
| `grossFloorArea` | Manual | Not in sources |

### 6. Areas (`areas`)

| Template Field | Source | Notes |
|----------------|--------|-------|
| `livingAreaM2` | Manual | Not in Pipedrive/Besichtigung |
| `balconyAreaM2` | Manual | |

### 7. Inspection (`inspection`)

| Template Field | Source | Notes |
|----------------|--------|-------|
| `attendees` | Manual | "Der Mieter / Name anonymisiert" |
| `areasVisited` | Derived from Besichtigung | List rooms from images/components |

### 8. Narratives (`narratives`) - LLM GENERATED

| Template Field | Generated from |
|----------------|----------------|
| `useDescription` | Besichtigung `einheit.nutzung` |
| `verticalAccess` | Besichtigung images (Treppenhaus) |
| `overallCondition` | ALL: baujahr, components zustand, modernisierungsjahre |
| `insulation` | Besichtigung `fassadeDaemmung` + component conditions |
| `barrierFree` | Derived from building type |
| `modernizationList` | Besichtigung components with years |
| `floorPlanQuality` | Standard text or derived |
| `barrierFreeShort` | Standard "Nicht barrierefrei" |
| `lighting` | Standard or from images |
| `balcony` | From images or components |
| `defects` | Besichtigung `erkennbareMaengel` |
| `otherNotes` | Standard disclaimer |

### 9. Components (`components`)

| Template Field | Source | Notes |
|----------------|--------|-------|
| `sanitaryInstallation` | Besichtigung `Sanitär.erlaeuterung` | |
| `electricalInstallation` | Besichtigung `Elektroinstallation.erlaeuterung` | |
| `heatingType` | Besichtigung `Heizung.erlaeuterung` | |
| `specialFeatures` | Derived from images/components | "Balkon" etc. |

### 10. Modernization Matrix (`modernization`)

Maps directly from Besichtigung component `modernisierungsjahr`:

| Template Field | Besichtigung Component | Points logic |
|----------------|------------------------|--------------|
| `roofRenewal` | `Dächer` | year → points (0-4) |
| `windowModernization` | `Fenster` | year → points |
| `plumbingModernization` | `Sanitär` | year → points |
| `heatingModernization` | `Heizung` | year → points |
| `wallInsulation` | `Fassade` (Dämmung) | year → points |
| `bathroomModernization` | `Sanitär` + `Innenwandbekleidung` | year → points |
| `interiorModernization` | `Bodenbeläge` + `Innentüren` | year → points |
| `floorPlanImprovement` | Usually 0 | |

---

## Unified Input Schema

```typescript
interface GutachtenInput {
  // === FROM PIPEDRIVE ===
  pipedrive: {
    caseId: string;
    kunde: {
      name: string;
      email?: string;
      telefon?: string;
    };
    objekt: {
      strasse?: string;
      plz?: string;
      ort?: string;
      baujahr: number;
      gebaeudetyp: string;
    };
    bewertung: {
      stichtag: string;
    };
    ergebnis: {
      restnutzungsdauer: number;
      gesamtnutzungsdauer: number;
    };
  };

  // === FROM BESICHTIGUNG PDF ===
  besichtigung: {
    aktenzeichen: string;
    inspektionsDatum: string;
    sachverstaendiger: string;
    objektadresse: {
      strasse: string;
      plz: string;
      ort: string;
    };
    objektart: string;
    objektlage: {
      beurteilung?: string;
      // ... other location fields
    };
    objektmerkmale: {
      wohneinheiten?: number;
      vollgeschosse?: number;
      bauweise?: string;
      fenster?: string;
      fassadeDaemmung?: string;
    };
    // The specific unit being appraised
    einheit: {
      name: string;
      lage?: string;
      baujahr?: number;
      komponenten: Array<{
        label: string;
        zustand: string;
        modernisierungsjahr?: string;
        erlaeuterung?: string;
      }>;
      gesamteindruck?: string;
      bemerkungen?: string;
    };
  };

  // === IMAGES ===
  images: {
    strassenschild?: string;
    vorderansicht?: string;
    hauseingang?: string;
    treppenhaus?: string;
    keller?: string;
    // Unit-specific
    eingang?: string;
    bad?: string;
    kueche?: string;
    wohnzimmer?: string;
    schlafzimmer?: string;
    fenster?: string;
    sicherungskasten?: string;
  };

  // === MANUAL INPUTS ===
  manual: {
    unitType?: string;        // "3-Zimmer-Wohnung"
    livingAreaM2?: number;
    balconyAreaM2?: number;
    energyClass?: string;
    attendees?: string;
  };
}
```

---

## Example: contract-58984 + matched Pipedrive case

**Step 1: Match Besichtigung to Pipedrive**
- Besichtigung address: "Piepenstockplatz 5, 44263 Dortmund"
- Besichtigung aktenzeichen: "Subowiak Dortmund"
- Find Pipedrive case where `objekt.adresse` or `kunde.name` matches

**Step 2: Merge data**
```json
{
  "pipedrive": {
    "caseId": "xxxxx",
    "kunde": { "name": "Subowiak" },
    "objekt": { "baujahr": 1950, "gebaeudetyp": "MFH" },
    "ergebnis": { "restnutzungsdauer": 25, "gesamtnutzungsdauer": 80 }
  },
  "besichtigung": {
    "inspektionsDatum": "2025-10-28",
    "einheit": {
      "name": "Einheit 1",
      "lage": "3. OG links",
      "baujahr": 1950,
      "komponenten": [
        { "label": "Fassade", "zustand": "mittel", "modernisierungsjahr": "k.A." },
        { "label": "Fenster", "zustand": "mittel", "modernisierungsjahr": "2012" },
        // ...
      ]
    }
  },
  "images": {
    "strassenschild": "contract-58984/Straßenschild.jpg",
    "vorderansicht": "contract-58984/Vorderansicht.jpg",
    // ...
  }
}
```

**Step 3: Generate GutachtenData**
- Merge fields per mapping above
- LLM generates narratives based on merged data
- Output: complete `GutachtenData` ready for DOCX export

---

## Next Steps

1. [ ] Create `GutachtenInput` TypeScript interface
2. [ ] Build Pipedrive → Besichtigung matcher (by address or aktenzeichen)
3. [ ] Build merger function: `mergeToGutachtenData(input: GutachtenInput): GutachtenData`
4. [ ] Build narrative generator: uses merged data to create narratives
5. [ ] Test with contract-58984 end-to-end
