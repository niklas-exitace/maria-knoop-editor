/**
 * List all placeholders from the template.
 */

import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';

async function extractAllPlaceholders() {
  const templatePath = path.join(__dirname, '../data/template/gutachten-template.docx');
  const buffer = fs.readFileSync(templatePath);
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file('word/document.xml')?.async('string') || '';

  // Extract all text
  const textPattern = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let allText = '';
  let m;
  while ((m = textPattern.exec(xml)) !== null) {
    allText += m[1];
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('TEMPLATE PLACEHOLDERS (from document.xml)');
  console.log('═══════════════════════════════════════════════════════════');

  // Double curly
  console.log('\n── DOUBLE-CURLY {{...}} ──');
  const doubleCurly = allText.match(/\{\{[^}]+\}\}/g) || [];
  [...new Set(doubleCurly)].forEach(p => console.log('  ' + p));

  // Single curly (yellow highlights - sample values)
  console.log('\n── SINGLE-CURLY {...} (sample values) ──');
  const singleCurly = allText.match(/\{[^{}]+\}/g) || [];
  [...new Set(singleCurly)]
    .filter(p => !p.startsWith('{{'))
    .forEach(p => console.log('  ' + p));

  // Bracket blocks
  console.log('\n── BRACKET BLOCKS [...] (narratives) ──');
  const brackets = allText.match(/\[[^\]]{20,}\]/g) || [];
  [...new Set(brackets)].forEach(p => {
    const short = p.length > 70 ? p.substring(0, 67) + '...]' : p;
    console.log('  ' + short);
  });

  // Load manifest for authoritative list
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('FROM MANIFEST (authoritative list)');
  console.log('═══════════════════════════════════════════════════════════');

  const manifestPath = path.join(__dirname, '../data/RND-Gutachten-Template_MariaKnoop_clean_v2.manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  console.log('\n── Double-curly (6 total) ──');
  manifest.double_curly_placeholders.forEach((p: string) => console.log('  {{' + p + '}}'));

  console.log('\n── Single-curly (11 total) ──');
  manifest.curly_placeholders.forEach((p: string) => console.log('  {' + p + '}'));

  console.log('\n── Bracket blocks (8 total) ──');
  manifest.bracket_blocks.forEach((p: string) => {
    const short = p.length > 65 ? p.substring(0, 62) + '...' : p;
    console.log('  [' + short + ']');
  });

  // Modernization table
  console.log('\n── Modernization Table (8 rows) ──');
  manifest.sections_added['3.2 Festlegung des Modernisierungsgrads'].modernization_table.rows.forEach((row: any) => {
    console.log(`  ${row.key}: "${row.label}" (max: ${row.max}, example: ${row.punkte_example})`);
  });

  // Compare with test data
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('TEST DATA COVERAGE');
  console.log('═══════════════════════════════════════════════════════════');

  const testDataPath = path.join(__dirname, '../data/test-subowiak-merged.json');
  const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));

  console.log('\n── Data sections in test case ──');
  Object.keys(testData).forEach(section => {
    const fields = Object.keys(testData[section]);
    console.log(`  ${section}: ${fields.join(', ')}`);
  });
}

extractAllPlaceholders().catch(console.error);
