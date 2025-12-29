/**
 * Merge Pipedrive + Besichtigung data into GutachtenData for template
 */

import type { GutachtenData } from './schema';

// =============================================================================
// INPUT TYPES
// =============================================================================

/**
 * Raw Pipedrive export row (column names from Excel)
 */
export interface PipedriveRow {
  'Kontaktperson': string;
  'Objektadresse': string;
  'Objektstraße'?: string;
  'Objekt PLZ'?: string;
  'Objekt Ort'?: string;
  'Baujahr': number;
  'Fläche (m²)': number;
  'RND': number;
  'Gebäudetyp': string;
  'Anzahl Einheiten': number;
  'Anzahl Vollgeschosse': number;
  'Bewertungsstichtag (final)': string;
  'Gutachten_ID': string;
  'Rechnungsadresse'?: string;

  // Modernization points
  'Dach (Punkte)': number;
  'Fenster (Punkte)': number;
  'Leitungen (Punkte)': number;
  'Heizung (Punkte)': number;
  'Dämmung (Punkte)': number;
  'Bäder (Punkte)': number;
  'Innenausbau (Punkte)': number;
  'Grundriss (Punkte)': number;

  // Modernization status
  'Dach': string;
  'Fenster': string;
  'Leitungen': string;
  'Heizung': string;
  'Dämmung': string;
  'Bäder': string;
  'Innenausbau': string;
  'Grundriss': string;

  // Baudetails
  'Bauweise': string;
  'Dachkonstruktion': string;
  'Dacheindeckung': string;
  'Geschossdecken': string;
  'Heizungstyp': string;
  'Keller': string;
  'Verglasung': string;
  'Nebengebäude': string;

  // Other
  'Besichtigung'?: string;
  'Energieausweis'?: string;
}

/**
 * Parsed Besichtigung data (from simple parser)
 */
export interface BesichtigungData {
  aktenzeichen: string;
  inspektionsDatum: string;
  inspektionsZeit?: string;
  sachverstaendiger: string;
  objektadresse: {
    strasse: string;
    plz: string;
    ort: string;
  };
  objektart: string;
  objektlage: {
    beurteilung?: string;
    besiedelung?: string;
    wohngegend?: string;
  };
  objektmerkmale: {
    wohneinheiten?: number;
    vollgeschosse?: number;
    bauweise?: string;
    fenster?: string;
    fassadeDaemmung?: string;
  };
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
}

/**
 * Image paths for the gutachten
 */
export interface GutachtenImages {
  strassenschild?: string;
  vorderansicht?: string;
  hauseingang?: string;
  treppenhaus?: string;
  // Unit-specific
  bad?: string;
  kueche?: string;
  wohnzimmer?: string;
  schlafzimmer?: string;
}

// =============================================================================
// MERGER
// =============================================================================

export function mergeToGutachtenData(
  pipedrive: PipedriveRow,
  besichtigung: BesichtigungData,
  images?: GutachtenImages
): GutachtenData {
  // Parse address from Pipedrive (may have newlines)
  const pdAddress = parseAddress(pipedrive['Objektadresse']);

  // Use Besichtigung address as primary (more reliable)
  const address = besichtigung.objektadresse.strasse
    ? besichtigung.objektadresse
    : pdAddress;

  // Get component data from Besichtigung
  const getComponent = (label: string) =>
    besichtigung.einheit.komponenten.find(c =>
      c.label.toLowerCase().includes(label.toLowerCase())
    );

  const fassade = getComponent('Fassade');
  const fenster = getComponent('Fenster');
  const dach = getComponent('Däch');
  const sanitaer = getComponent('Sanitär');
  const heizung = getComponent('Heizung');
  const elektro = getComponent('Elektro');
  const boeden = getComponent('Boden');
  const tueren = getComponent('Innentür');

  // Build modernization list from Besichtigung components
  const modernizationList = buildModernizationList(besichtigung.einheit.komponenten);

  // Calculate floors string
  const floors = pipedrive['Keller']?.includes('unterkellert')
    ? `UG - ${pipedrive['Anzahl Vollgeschosse']}. OG`
    : `EG - ${pipedrive['Anzahl Vollgeschosse']}. OG`;

  // Format inspection date (YYYY-MM-DD -> DD.MM.YYYY)
  const inspectionDate = formatDateDE(besichtigung.inspektionsDatum);
  const valuationDate = formatDateDE(pipedrive['Bewertungsstichtag (final)']);
  const reportDate = formatDateDE(new Date().toISOString().split('T')[0]);

  return {
    property: {
      unitType: mapGebaeudetype(pipedrive['Gebäudetyp'], pipedrive['Fläche (m²)']),
      unitPosition: besichtigung.einheit.lage || '',
      street: address.strasse,
      zipCode: address.plz,
      city: address.ort,
    },

    dates: {
      valuationDate,
      inspectionDate,
      reportDate,
    },

    client: {
      name: pipedrive['Kontaktperson'],
    },

    building: {
      type: `${pipedrive['Gebäudetyp']} mit ${pipedrive['Anzahl Einheiten']} Wohnungen`,
      yearBuilt: pipedrive['Baujahr'],
      floors,
      atticInfo: 'DG nicht ausgebaut', // Default, could derive from data
      foundation: pipedrive['Keller'] || 'k. A.',
      exteriorWalls: fassade?.erlaeuterung || pipedrive['Bauweise'] || 'Massivbauweise',
      roof: `${pipedrive['Dachkonstruktion']} mit ${pipedrive['Dacheindeckung']}`,
      windows: fenster?.erlaeuterung || pipedrive['Verglasung'] || 'Isolierverglasung',
      heating: heizung?.erlaeuterung || pipedrive['Heizungstyp'] || 'Zentralheizung',
      energyClass: pipedrive['Energieausweis'] || 'k. A.',
    },

    calculation: {
      restnutzungsdauerYears: pipedrive['RND'],
      gesamtnutzungsdauerYears: 80,
      standardStufe: 'ImmoWertV – Stufe 2 bis 3',
      grossFloorArea: 'k. A.',
    },

    areas: {
      livingAreaM2: pipedrive['Fläche (m²)'],
      balconyAreaM2: 0,
    },

    inspection: {
      attendees: 'Der Mieter / Name anonymisiert',
      areasVisited: buildAreasVisited(besichtigung.einheit.komponenten),
    },

    narratives: {
      useDescription: 'Wohnwirtschaftliche Nutzung des gesamten Gebäudes.',
      verticalAccess: 'Die vertikale Erschließung aller Etagen des Gebäudes erfolgt über das Treppenhaus. Ein Aufzug ist nicht vorhanden.',
      overallCondition: buildOverallCondition(besichtigung, pipedrive),
      insulation: buildInsulationText(pipedrive['Dämmung'], fassade),
      barrierFree: 'Das Haus ist nicht barrierefrei. Um eine Barrierefreiheit herzustellen, müssten größere Umbaumaßnahmen durchgeführt werden.',
      modernizationList,
      floorPlanQuality: 'Die Qualität des Grundrisses ist als zweckmäßig zu bezeichnen.',
      barrierFreeShort: 'Nicht barrierefrei',
      lighting: 'Die Belichtungsverhältnisse sind einwandfrei.',
      balcony: 'Das Sondereigentum verfügt über keinen Balkon.', // Would need to derive
      defects: besichtigung.einheit.bemerkungen || 'Wesentliche Bauschäden konnten während der Besichtigung nicht festgestellt werden.',
      otherNotes: 'Weitere Bautechnische Beanstandungen konnten während des Ortstermins nicht festgestellt werden. Die Aufstellung der bautechnischen Beanstandungen erhebt nicht den Anspruch auf Vollständigkeit, da das vorliegende Gutachten kein qualifiziertes Bauschadensgutachten ersetzen soll und kann.',
    },

    components: {
      sanitaryInstallation: sanitaer?.erlaeuterung || 'Durchschnittliche Ausstattung',
      electricalInstallation: elektro?.erlaeuterung || 'Durchschnittliche Ausstattung',
      heatingType: 'Heizkörper',
      specialFeatures: '', // Would derive from images/data
    },

    modernization: {
      roofRenewal: {
        points: pipedrive['Dach (Punkte)'],
        weight: pipedrive['Dach (Punkte)'] > 0 ? 0.5 : 0
      },
      windowModernization: {
        points: pipedrive['Fenster (Punkte)'],
        weight: pipedrive['Fenster (Punkte)'] > 0 ? 0.5 : 0
      },
      plumbingModernization: {
        points: pipedrive['Leitungen (Punkte)'],
        weight: pipedrive['Leitungen (Punkte)'] > 0 ? 0.5 : 0
      },
      heatingModernization: {
        points: pipedrive['Heizung (Punkte)'],
        weight: pipedrive['Heizung (Punkte)'] > 0 ? 0.5 : 0
      },
      wallInsulation: {
        points: pipedrive['Dämmung (Punkte)'],
        weight: pipedrive['Dämmung (Punkte)'] > 0 ? 0.5 : 0
      },
      bathroomModernization: {
        points: pipedrive['Bäder (Punkte)'],
        weight: pipedrive['Bäder (Punkte)'] > 0 ? 0.5 : 0
      },
      interiorModernization: {
        points: pipedrive['Innenausbau (Punkte)'],
        weight: pipedrive['Innenausbau (Punkte)'] > 0 ? 0.5 : 0
      },
      floorPlanImprovement: {
        points: pipedrive['Grundriss (Punkte)'],
        weight: pipedrive['Grundriss (Punkte)'] > 0 ? 0.5 : 0
      },
    },
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function parseAddress(addr: string): { strasse: string; plz: string; ort: string } {
  if (!addr) return { strasse: '', plz: '', ort: '' };

  // Handle "Piepenstockplatz 5\n44263 Dortmund" format
  const lines = addr.split('\n').map(l => l.trim()).filter(Boolean);

  if (lines.length >= 2) {
    const strasse = lines[0];
    const plzOrt = lines[1].match(/(\d{5})\s+(.+)/);
    if (plzOrt) {
      return { strasse, plz: plzOrt[1], ort: plzOrt[2] };
    }
  }

  // Try single line "Street, PLZ City"
  const match = addr.match(/(.+),?\s+(\d{5})\s+(.+)/);
  if (match) {
    return { strasse: match[1].trim(), plz: match[2], ort: match[3].trim() };
  }

  return { strasse: addr, plz: '', ort: '' };
}

function formatDateDE(isoDate: string): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}.${m}.${y}`;
}

function mapGebaeudetype(typ: string, flaeche: number): string {
  // "Einzelne Eigentumswohnung" -> "X-Zimmer-Wohnung"
  // Estimate rooms from area
  const rooms = flaeche < 40 ? 1 : flaeche < 60 ? 2 : flaeche < 80 ? 3 : 4;
  return `${rooms}-Zimmer-Wohnung`;
}

function buildModernizationList(komponenten: BesichtigungData['einheit']['komponenten']): string {
  const lines: string[] = [];

  const mapping: Record<string, string> = {
    'däch': 'Dacherneuerung inkl. Wärmedämmung',
    'fenster': 'Modernisierung der Fenster',
    'elektro': 'Modernisierung der Leitungssysteme',
    'heizung': 'Modernisierung der Heizungsanlage',
    'fassade': 'Wärmedämmung der Außenwände',
    'sanitär': 'Modernisierung der Bäder',
    'boden': 'Modernisierung des Innenausbaus',
  };

  for (const comp of komponenten) {
    const label = comp.label.toLowerCase();
    for (const [key, desc] of Object.entries(mapping)) {
      if (label.includes(key)) {
        const year = comp.modernisierungsjahr === 'k.A.' ? '-' : comp.modernisierungsjahr || '-';
        lines.push(`${desc}: ${year}`);
        break;
      }
    }
  }

  lines.push('Wesentliche Verbesserung der Grundrissgestaltung: -');

  return lines.join('\n');
}

function buildAreasVisited(komponenten: BesichtigungData['einheit']['komponenten']): string {
  const areas: string[] = ['Treppenaufgang'];

  const hasComp = (label: string) =>
    komponenten.some(c => c.label.toLowerCase().includes(label.toLowerCase()));

  if (hasComp('sanitär') || hasComp('bad')) areas.push('Badezimmer');
  if (hasComp('heizung')) areas.push('Heizungsraum');
  areas.push('Wohn-/Schlafräume', 'Küche');

  return areas.join(', ');
}

function buildOverallCondition(besichtigung: BesichtigungData, pipedrive: PipedriveRow): string {
  const baujahr = pipedrive['Baujahr'];
  const alter = new Date().getFullYear() - baujahr;
  const zustand = besichtigung.einheit.gesamteindruck || 'mittel';

  const zustandText = zustand === 'gut'
    ? 'als dem Alter entsprechend zu beurteilen ist'
    : zustand === 'mittel'
    ? 'als nicht mehr zeitgemäß zu beurteilen ist'
    : 'als sanierungsbedürftig zu beurteilen ist';

  return `Insgesamt kann festgestellt werden, dass der Zustand des Wertermittlungsobjektes auch unter Berücksichtigung der durchgeführten Modernisierungsmaßnahmen ${zustandText}. Das Gebäude wurde ${baujahr} errichtet und weist ein Alter von ${alter} Jahren auf. Eine energetische Sanierung ist in Betracht zu ziehen. Die Allgemeinbereiche und die Erschließung des Objektes sind in mittlerem Zustand. Wesentliche Schäden an den baulichen Anlagen sind aus der Ortsbesichtigung nicht ersichtlich.`;
}

function buildInsulationText(daemmungStatus: string, fassade?: { zustand: string; erlaeuterung?: string }): string {
  if (daemmungStatus?.includes('nicht')) {
    return 'Die Wärmedämmung entspricht nicht den modernen Anforderungen. Die Energiekosten sind aufgrund der veralteten Wärmedämmung verhältnismäßig hoch.';
  }
  return 'Die Wärmedämmung entspricht den Anforderungen des Baujahres. Eine Verbesserung der energetischen Eigenschaften wäre empfehlenswert.';
}
