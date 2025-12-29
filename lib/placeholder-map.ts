/**
 * Placeholder mappings for Maria Knoop REBUILT v3 template.
 *
 * This template uses TWO placeholder formats:
 * 1. Double-curly with spaces: {{ variable_name }}
 * 2. Single-curly with spaces: { sample_value } or { variable_name }
 * 3. Single-curly without spaces: {value} (for compact values like {80 J})
 */

import type { GutachtenData } from './schema';

/**
 * Double-curly placeholder mappings.
 * Note: Template uses spaces inside braces: {{ variable_name }}
 */
export const DOUBLE_CURLY_MAP: Record<string, (data: GutachtenData) => string> = {
  // With spaces (as they appear in template)
  ' client_name ': (d) => d.client.name,
  ' object_street ': (d) => d.property.street,
  ' object_zip ': (d) => d.property.zipCode,
  ' object_town ': (d) => d.property.city,
  ' object_appraise_date ': (d) => d.dates.valuationDate,
  ' object_visit_date ': (d) => d.dates.inspectionDate,
  // Without spaces (fallback)
  'client_name': (d) => d.client.name,
  'object_street': (d) => d.property.street,
  'object_zip': (d) => d.property.zipCode,
  'object_town': (d) => d.property.city,
  'object_appraise_date': (d) => d.dates.valuationDate,
  'object_visit_date': (d) => d.dates.inspectionDate,
};

/**
 * Calculate derived values needed for replacements.
 */
export function calculateDerivedValues(data: GutachtenData) {
  const currentYear = new Date().getFullYear();
  const rnd = data.calculation.restnutzungsdauerYears;

  // Modified year = when the building was "effectively" built after modernization
  const modifiedYear = currentYear - rnd;

  // Total modernization points (weighted sum)
  const totalPoints = Object.values(data.modernization).reduce(
    (sum, m) => sum + m.points * m.weight,
    0
  );

  return {
    modifiedYear,
    totalPoints,
    totalPointsFormatted: totalPoints.toFixed(1).replace('.', ','),
  };
}

/**
 * Single-curly placeholder mappings.
 * Handles both { value } (with spaces) and {value} (without spaces).
 */
export function createSingleCurlyMap(
  data: GutachtenData
): Map<string, string> {
  const derived = calculateDerivedValues(data);
  const map = new Map<string, string>();

  // === VARIABLE-STYLE PLACEHOLDERS (with spaces) ===
  // These appear as { variable_name } in the template
  map.set(' client_name ', data.client.name);
  map.set(' object_street ', data.property.street);
  map.set(' object_zip ', data.property.zipCode);
  map.set(' object_town ', data.property.city);
  map.set(' object_appraise_date ', data.dates.valuationDate);
  map.set(' object_visit_date ', data.dates.inspectionDate);

  // === SAMPLE VALUE PLACEHOLDERS ===
  // Format: { sample_value } (with spaces)
  map.set(' 3-Zimmer-Wohnung ', data.property.unitType);
  map.set(' 3-Zimmer- Wohnung ', data.property.unitType); // Handle split text
  map.set(' (3. OG rechts) ', `(${data.property.unitPosition})`);
  map.set(' David Eberlein ', data.client.name);
  map.set(' 07.10.2025 ', data.dates.valuationDate);
  map.set(' 29 Jahre ', `${data.calculation.restnutzungsdauerYears} Jahre`);
  map.set(' 1964 ', String(data.building.yearBuilt));

  // === COMPACT PLACEHOLDERS (no spaces) ===
  // Format: {value}
  map.set('80 J', `${data.calculation.gesamtnutzungsdauerYears} J`);
  map.set('29 J', `${data.calculation.restnutzungsdauerYears} J`);
  map.set('5,0', derived.totalPointsFormatted);
  map.set('5 Punkte', `${derived.totalPointsFormatted} Punkte`);
  map.set('29 Jahre', `${data.calculation.restnutzungsdauerYears} Jahre`);
  map.set('07.10.2025', data.dates.valuationDate);
  map.set('03.11.2025', data.dates.reportDate);
  map.set('1964', String(data.building.yearBuilt));
  map.set('1974', String(derived.modifiedYear));

  // === DIRECT VALUE REPLACEMENTS (no braces in template) ===
  map.set('3-Zimmer-Wohnung', data.property.unitType);
  map.set('David Eberlein', data.client.name);
  map.set('Daimlerstraße 4c', data.property.street);
  map.set('21337 Lüneburg', `${data.property.zipCode} ${data.property.city}`);
  map.set('Lüneburg', data.property.city);
  map.set('56,09', String(data.areas.livingAreaM2).replace('.', ','));
  map.set('Mehrfamilienhaus', data.building.type);
  map.set('Effizienzklasse D', `Effizienzklasse ${data.building.energyClass}`);
  map.set('288892', data.document?.reportNumber ?? '288892');
  map.set('3. OG rechts', data.property.unitPosition);
  map.set('(3. OG rechts)', `(${data.property.unitPosition})`);

  return map;
}

/**
 * Narrative block replacements.
 * Maps sample narrative paragraphs to actual narratives.
 * Template uses [content] format WITHOUT spaces inside brackets.
 *
 * From template analysis, these are the exact bracket blocks:
 * 1. [Treppenaufgang, 2 Wohn-/ Schlafräume sowie Küche und Badezimmer]
 * 2. [Das Objekt ist zum Wertermittlungsstichtag vermietet]
 * 3. [Wohnwirtschaftliche Nutzung des gesamten Gebäudes]
 * 4. [Die vertikale Erschließung aller Etagen des Gebäudes, erfolgt über das Treppenhaus. Ein Aufzug ist nicht vorhanden.]
 * 5. [Die Effizienzklasse D liegt gem. HypZert Studie im Vertrauensbereich (A-D)]
 * 6. [Die baulichen Anlagen wurden nur in Maßen instand gehalten ...]
 * 7. [Die Wärmedämmung entspricht nicht ... Das Haus ist nicht barrierefrei ...]  (combined, no space between sentences)
 * 8. [Luftbild / Kartenausschnitt hier einfügen]
 */
export function createBracketBlockMap(
  data: GutachtenData
): Map<string, string> {
  const map = new Map<string, string>();

  // === INSPECTION AREAS ===
  // Template: [Treppenaufgang, 2 Wohn-/ Schlafräume sowie Küche und Badezimmer]
  map.set(
    '[Treppenaufgang, 2 Wohn-/ Schlafräume sowie Küche und Badezimmer]',
    data.inspection.areasVisited
  );

  // === RENTAL STATUS ===
  // Template: [Das Objekt ist zum Wertermittlungsstichtag vermietet]
  map.set(
    '[Das Objekt ist zum Wertermittlungsstichtag vermietet]',
    'Das Objekt ist zum Wertermittlungsstichtag vermietet'
  );

  // === USE DESCRIPTION ===
  // Template: [Wohnwirtschaftliche Nutzung des gesamten Gebäudes]
  map.set(
    '[Wohnwirtschaftliche Nutzung des gesamten Gebäudes]',
    data.narratives.useDescription
  );

  // === VERTICAL ACCESS / ELEVATOR ===
  // Template: [Die vertikale Erschließung aller Etagen des Gebäudes, erfolgt über das Treppenhaus. Ein Aufzug ist nicht vorhanden.]
  map.set(
    '[Die vertikale Erschließung aller Etagen des Gebäudes, erfolgt über das Treppenhaus. Ein Aufzug ist nicht vorhanden.]',
    data.narratives.verticalAccess
  );

  // === ENERGY CLASS NOTE ===
  // Template: [Die Effizienzklasse D liegt gem. HypZert Studie im Vertrauensbereich (A-D)]
  map.set(
    '[Die Effizienzklasse D liegt gem. HypZert Studie im Vertrauensbereich (A-D)]',
    `Die Effizienzklasse ${data.building.energyClass} liegt gem. HypZert Studie im Vertrauensbereich (A-D)`
  );

  // === MODERNIZATION/MAINTENANCE STATUS ===
  // Template: [Die baulichen Anlagen wurden nur in Maßen instand gehalten (in Maßen, einfach, mittel überwiegend, vollständig). Das Sondereigentum / (Objekt) wurde in 2022 durch den Eigentümer modernisiert (Badezimmer, Elektrik, tlw. Bodenbelege).]
  map.set(
    '[Die baulichen Anlagen wurden nur in Maßen instand gehalten (in Maßen, einfach, mittel überwiegend, vollständig). Das Sondereigentum / (Objekt) wurde in 2022 durch den Eigentümer modernisiert (Badezimmer, Elektrik, tlw. Bodenbelege).]',
    data.narratives.modernizationList
  );

  // === INSULATION + BARRIER-FREE COMBINED ===
  // Template: [Die Wärmedämmung entspricht nicht den modernen Anforderungen. Die Energiekosten sind aufgrund der veralteten Wärmedämmung verhältnismäßig hoch.Das Haus ist nicht barrierefrei. Um eine Barrierefreiheit herzustellen, müssten größere Umbaumaßnahmen durchgeführt werden.]
  // NOTE: No space between "hoch." and "Das" in the template!
  map.set(
    '[Die Wärmedämmung entspricht nicht den modernen Anforderungen. Die Energiekosten sind aufgrund der veralteten Wärmedämmung verhältnismäßig hoch.Das Haus ist nicht barrierefrei. Um eine Barrierefreiheit herzustellen, müssten größere Umbaumaßnahmen durchgeführt werden.]',
    `${data.narratives.insulation} ${data.narratives.barrierFree}`
  );

  // === IMAGE PLACEHOLDER ===
  // Template: [Luftbild / Kartenausschnitt hier einfügen]
  map.set(
    '[Luftbild / Kartenausschnitt hier einfügen]',
    '' // Remove this placeholder text, image handled separately
  );

  return map;
}

/**
 * Modernization table row mappings.
 */
export function createModernizationTableMap(
  data: GutachtenData
): Map<string, string> {
  const map = new Map<string, string>();
  const fmt = (n: number) => n.toFixed(1).replace('.', ',');

  map.set('0,5', fmt(data.modernization.roofRenewal.points * data.modernization.roofRenewal.weight));
  map.set('1,0', fmt(data.modernization.windowModernization.points * data.modernization.windowModernization.weight));

  return map;
}
