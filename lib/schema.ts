/**
 * Gutachten (Appraisal) data schema.
 *
 * This defines all editable fields in the Restnutzungsdauer template,
 * grouped by semantic section.
 */

export interface GutachtenData {
  // === DOCUMENT METADATA ===
  document?: {
    reportNumber?: string; // e.g., "88892"
    reportId?: string; // internal ID e.g., "D5bPs47n2gWJ"
    textPages?: number; // page count for text section
    annexPages?: number; // page count for annexes
  };

  // === PROPERTY INFO ===
  property: {
    unitType: string; // "3-Zimmer-Wohnung" or "2-Zimmer-Wohnung" etc.
    unitPosition: string; // "3. OG rechts"
    street: string; // "Daimlerstraße 4c"
    zipCode: string; // "21337"
    city: string; // "Lüneburg"
  };

  // === DATES ===
  dates: {
    valuationDate: string; // Wertermittlungsstichtag - "07.10.2025"
    inspectionDate: string; // Besichtigungsdatum - "07.10.2025"
    reportDate: string; // Gutachtendatum - "03.11.2025"
  };

  // === CLIENT ===
  client: {
    name: string; // "David Eberlein"
  };

  // === BUILDING INFO ===
  building: {
    type: string; // "Mehrfamilienhaus mit 28 Wohnungen"
    unitsCount?: number; // 28 (extracted from type, or explicit)
    yearBuilt: number; // 1964
    floors: string; // "UG - 3. OG"
    atticInfo: string; // "DG nicht ausgebaut"
    foundation: string; // "Untergeschoss, Stampfbeton"
    exteriorWalls: string; // construction type
    roof: string; // roof type
    windows: string; // window type
    heating: string; // heating system
    energyClass: string; // "D" or "k. A."
    aufzug?: boolean; // Has elevator?
    nutzungsart?: 'wohnwirtschaftlich' | 'gewerblich' | 'gemischt';
  };

  // === CALCULATION ===
  calculation: {
    restnutzungsdauerYears: number; // 29
    gesamtnutzungsdauerYears: number; // 80
    standardStufe: string; // "ImmoWertV – Stufe 2 bis 3"
    grossFloorArea: string; // Brutto-Grundfläche
  };

  // === AREA CALCULATION (Wohnflächenberechnung) ===
  areas: {
    livingAreaM2: number; // 56.09
    balconyAreaM2: number; // if applicable
  };

  // === ACCESSIBILITY (Barrierefreiheit) ===
  accessibility?: {
    barrierefrei: boolean; // Is unit barrier-free accessible?
    belichtung: 'einwandfrei' | 'eingeschraenkt' | 'mangelhaft'; // Lighting conditions
  };

  // === OUTDOOR SPACES (Außenbereiche) ===
  outdoor?: {
    hatBalkon: boolean;
    hatTerrasse: boolean;
    hatGarten: boolean;
    flaeche: number; // Combined outdoor area in m² (0 if none)
  };

  // === INSPECTION (Besichtigung) ===
  inspection: {
    attendees: string; // "Der Mieter / Name anonymisiert"
    areasVisited: string; // "Treppenaufgang, 2 Wohn-/Schlafräume..."
  };

  // === NARRATIVES (Cyan blocks - LLM generated) ===
  narratives: {
    useDescription: string; // "Wohnwirtschaftliche Nutzung..."
    verticalAccess: string; // "vertikale Erschließung..."
    overallCondition: string; // Long condition assessment
    insulation: string; // Wärmedämmung assessment
    barrierFree: string; // Barrierefreiheit assessment
    modernizationList: string; // List of modernizations
    floorPlanQuality: string; // Grundrissqualität
    barrierFreeShort: string; // Short barrier-free status
    lighting: string; // Belichtungsverhältnisse
    balcony: string; // Balkon info
    defects: string; // Bauschäden
    otherNotes: string; // Sonstige Anmerkungen
  };

  // === BUILDING COMPONENTS (Gebäudemerkmale) - Page 9/10 ===
  components: {
    sanitaryInstallation: string;
    electricalInstallation: string;
    heatingType: string;
    specialFeatures: string;
  };

  // === MODERNIZATION MATRIX (Page 11/12) ===
  modernization: {
    roofRenewal: { points: number; weight: number };
    windowModernization: { points: number; weight: number };
    plumbingModernization: { points: number; weight: number };
    heatingModernization: { points: number; weight: number };
    wallInsulation: { points: number; weight: number };
    bathroomModernization: { points: number; weight: number };
    interiorModernization: { points: number; weight: number };
    floorPlanImprovement: { points: number; weight: number };
  };

  // === ASSETS (for Anlagen - images, documents) ===
  assets?: {
    aerial?: {
      source: 'GoogleMaps' | 'other';
      imageUrl?: string;
      caption?: string;
    };
    photos?: Array<{
      nr: number;
      caption: string;
      imageUrl?: string;
    }>;
    floorplan?: {
      imageUrl?: string;
      source?: string;
    };
    energyCertificate?: {
      pdfUrl?: string;
      imageUrl?: string;
    };
  };
}

/**
 * Default values matching the Lüneburg example template.
 */
export const DEFAULT_GUTACHTEN_DATA: GutachtenData = {
  property: {
    unitType: '3-Zimmer-Wohnung',
    unitPosition: '3. OG rechts',
    street: 'Daimlerstraße 4c',
    zipCode: '21337',
    city: 'Lüneburg',
  },
  dates: {
    valuationDate: '07.10.2025',
    inspectionDate: '07.10.2025',
    reportDate: '03.11.2025',
  },
  client: {
    name: 'David Eberlein',
  },
  building: {
    type: 'Mehrfamilienhaus mit 28 Wohnungen',
    yearBuilt: 1964,
    floors: 'UG - 3. OG',
    atticInfo: 'DG nicht ausgebaut',
    foundation: 'Untergeschoss, Stampfbeton',
    exteriorWalls: 'Mauerwerk, verputzt',
    roof: 'Flachdach mit Bitumenabdichtung',
    windows: 'Kunststofffenster, Isolierverglasung',
    heating: 'Zentralheizung (Gas)',
    energyClass: 'D',
    aufzug: false, // Most older MFH don't have elevators
    nutzungsart: 'wohnwirtschaftlich',
  },
  calculation: {
    restnutzungsdauerYears: 29,
    gesamtnutzungsdauerYears: 80,
    standardStufe: 'ImmoWertV – Stufe 2 bis 3',
    grossFloorArea: 'k. A.',
  },
  areas: {
    livingAreaM2: 56.09,
    balconyAreaM2: 0,
  },
  accessibility: {
    barrierefrei: false, // Most older buildings without elevator
    belichtung: 'einwandfrei', // Default assumption unless noted
  },
  outdoor: {
    hatBalkon: true, // Lüneburg example has balcony
    hatTerrasse: false,
    hatGarten: false,
    flaeche: 0, // Not specified in this case
  },
  inspection: {
    attendees: 'Der Mieter / Name anonymisiert',
    areasVisited:
      'Treppenaufgang, 2 Wohn-/ Schlafräume sowie Küche und Badezimmer',
  },
  narratives: {
    useDescription: 'Wohnwirtschaftliche Nutzung des gesamten Gebäudes.',
    verticalAccess:
      'Die vertikale Erschließung aller Etagen des Gebäudes erfolgt über das Treppenhaus. Ein Aufzug ist nicht vorhanden.',
    overallCondition:
      'Insgesamt kann festgestellt werden, dass der Zustand des Wertermittlungsobjektes auch unter Berücksichtigung der einfachen Modernisierungsmaßnahmen im Zuge der ersichtlich laufenden Instandhaltung als nicht mehr zeitgemäß zu beurteilen ist. Eine energetische Sanierung ist in Betracht zu ziehen. Die Allgemeinbereiche und die Erschließung des Objektes sind mittelmäßig und dem Niveau des Objektes entsprechend. Die Außenanlagen befinden sich einem einfachen Zustand. Wesentliche Schäden an den baulichen Anlagen sind aus der Ortsbesichtigung nicht ersichtlich. Ein Instandhaltungsstau ist erkennbar, jedoch bereits über die kurze Restnutzungsdauer abgebildet.',
    insulation:
      'Die Wärmedämmung entspricht nicht den modernen Anforderungen. Die Energiekosten sind aufgrund der veralteten Wärmedämmung verhältnismäßig hoch.',
    barrierFree:
      'Das Haus ist nicht barrierefrei. Um eine Barrierefreiheit herzustellen, müssten größere Umbaumaßnahmen durchgeführt werden.',
    modernizationList: `Dacherneuerung inkl. Wärmedämmung: Dämmung des Dachbodens
Modernisierung der Fenster: laufender Austausch der Fenster/ unterschiedliche Baujahre
Modernisierung der Leitungssysteme: -/ Erneuerung der Elektrik ausschließlich im Sondereigentum
Modernisierung der Heizungsanlage: 2012
Wärmedämmung der Außenwände: nicht stattgefunden (nur Anstrich)
Modernisierung der Bäder: 2022 (im Sondereigentum)
Modernisierung des Innenausbaus: tlw. 2022
Wesentliche Verbesserung der Grundrissgestaltung: -`,
    floorPlanQuality:
      'Die Qualität des Grundrisses ist als zweckmäßig zu bezeichnen.',
    barrierFreeShort: 'Nicht barrierefrei',
    lighting: 'Die Belichtungsverhältnisse sind einwandfrei.',
    balcony: 'Das Sondereigentum verfügt über einen Balkon.',
    defects:
      'Bei der Besichtigung wurde festgestellt, dass an den Außenwänden im Wohnzimmer sowie am Balkon Feuchtigkeitsschäden an der Decke vorhanden sind. Augenscheinlich dringt Feuchtigkeit von außen ein.',
    otherNotes:
      'Weitere Bautechnische Beanstandungen konnten während des Ortstermins nicht festgestellt werden. Die Aufstellung der bautechnischen Beanstandungen erhebt nicht den Anspruch auf Vollständigkeit, da das vorliegende Gutachten kein qualifiziertes Bauschadensgutachten ersetzen soll und kann.',
  },
  components: {
    sanitaryInstallation: 'Durchschnittliche Ausstattung',
    electricalInstallation: 'Durchschnittliche Ausstattung',
    heatingType: 'Heizkörper',
    specialFeatures: 'Balkon',
  },
  modernization: {
    roofRenewal: { points: 4, weight: 0.5 },
    windowModernization: { points: 2, weight: 0.5 },
    plumbingModernization: { points: 0, weight: 0 },
    heatingModernization: { points: 3, weight: 0.5 },
    wallInsulation: { points: 0, weight: 0 },
    bathroomModernization: { points: 4, weight: 0.5 },
    interiorModernization: { points: 2, weight: 0.5 },
    floorPlanImprovement: { points: 0, weight: 0 },
  },
};

/**
 * Field sections for the form UI.
 */
export const FORM_SECTIONS = [
  {
    id: 'property',
    label: 'Objekt',
    description: 'Grunddaten der Immobilie',
  },
  {
    id: 'dates',
    label: 'Termine',
    description: 'Stichtage und Besichtigung',
  },
  {
    id: 'client',
    label: 'Auftraggeber',
    description: 'Kundendaten',
  },
  {
    id: 'building',
    label: 'Gebäude',
    description: 'Bauliche Eigenschaften',
  },
  {
    id: 'calculation',
    label: 'Berechnung',
    description: 'RND-Ermittlung',
  },
  {
    id: 'inspection',
    label: 'Besichtigung',
    description: 'Ortstermin-Details',
  },
  {
    id: 'narratives',
    label: 'Beschreibungen',
    description: 'Freitextfelder (KI-generiert)',
  },
  {
    id: 'components',
    label: 'Ausstattung',
    description: 'Gebäudemerkmale',
  },
] as const;
