/**
 * Test merge for Subowiak case
 *
 * Usage: npx tsx scripts/test-merge-subowiak.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { mergeToGutachtenData, type PipedriveRow, type BesichtigungData } from '../lib/gutachten-merger';

// Pipedrive data (from user's export)
const pipedriveRow: PipedriveRow = {
  'Kontaktperson': 'Tobias Subkowiak',
  'Objektadresse': 'Piepenstockplatz 5\n44263 Dortmund',
  'Baujahr': 1955,
  'Fläche (m²)': 49,
  'RND': 23,
  'Gebäudetyp': 'Einzelne Eigentumswohnung',
  'Anzahl Einheiten': 8,
  'Anzahl Vollgeschosse': 4,
  'Bewertungsstichtag (final)': '2024-01-01',
  'Gutachten_ID': 'md634w8h-ec1264',
  'Rechnungsadresse': 'Tobias Sobkowiak. Schweidnitzer Weg 2, 59872 Meschede',

  // Modernization points
  'Dach (Punkte)': 0,
  'Fenster (Punkte)': 1,
  'Leitungen (Punkte)': 0,
  'Heizung (Punkte)': 1,
  'Dämmung (Punkte)': 0,
  'Bäder (Punkte)': 0,
  'Innenausbau (Punkte)': 2,
  'Grundriss (Punkte)': 0,

  // Modernization status
  'Dach': 'vor mehr als 20 Jahren',
  'Fenster': 'vor ca. 15-20 Jahren',
  'Leitungen': 'vor mehr als 20 Jahren',
  'Heizung': 'vor ca. 10-15 Jahren',
  'Dämmung': 'nicht stattgefunden',
  'Bäder': 'vor ca. 10-15 Jahren',
  'Innenausbau': 'vor ca. 10-15 Jahren',
  'Grundriss': '0%',

  // Baudetails
  'Bauweise': 'Massivbausweise',
  'Dachkonstruktion': 'Satteldach',
  'Dacheindeckung': 'Dachziegelsteine',
  'Geschossdecken': 'Stahlbetondecke',
  'Heizungstyp': 'Gas Zentralheizung',
  'Keller': 'Voll unterkellert',
  'Verglasung': 'Zweifachverglasung',
  'Nebengebäude': 'keine/sonstige Nebengebäude',

  'Besichtigung': 'innen- / außen',
  'Energieausweis': '',
};

// Load Besichtigung data from parsed JSON
const besichtigungPath = path.join(__dirname, '../../gutachten-generator/data/parsed-simple/contract-58984.json');
const besichtigungRaw = JSON.parse(fs.readFileSync(besichtigungPath, 'utf-8'));

// Transform to BesichtigungData format (use first unit)
const besichtigung: BesichtigungData = {
  aktenzeichen: besichtigungRaw.aktenzeichen,
  inspektionsDatum: besichtigungRaw.inspektionsDatum,
  inspektionsZeit: besichtigungRaw.inspektionsZeit,
  sachverstaendiger: besichtigungRaw.sachverstaendiger,
  objektadresse: besichtigungRaw.objektadresse,
  objektart: besichtigungRaw.objektart,
  objektlage: besichtigungRaw.objektlage,
  objektmerkmale: besichtigungRaw.objektmerkmale,
  einheit: besichtigungRaw.einheiten[0], // Use first unit (3. OG links)
};

console.log('='.repeat(60));
console.log('TEST MERGE: Subowiak Dortmund');
console.log('='.repeat(60));

console.log('\n--- Pipedrive Data ---');
console.log('Client:', pipedriveRow['Kontaktperson']);
console.log('Address:', pipedriveRow['Objektadresse'].replace('\n', ', '));
console.log('Baujahr:', pipedriveRow['Baujahr']);
console.log('RND:', pipedriveRow['RND']);

console.log('\n--- Besichtigung Data ---');
console.log('Unit:', besichtigung.einheit.name, '-', besichtigung.einheit.lage);
console.log('Date:', besichtigung.inspektionsDatum);
console.log('Components:', besichtigung.einheit.komponenten.length);

// Merge
const gutachtenData = mergeToGutachtenData(pipedriveRow, besichtigung);

console.log('\n--- Merged GutachtenData ---');
console.log(JSON.stringify(gutachtenData, null, 2));

// Save output
const outputPath = path.join(__dirname, '../data/test-subowiak-merged.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(gutachtenData, null, 2));
console.log('\n✓ Saved to:', outputPath);
