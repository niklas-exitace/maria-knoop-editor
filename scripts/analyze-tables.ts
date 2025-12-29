/**
 * Analyze tables in the DOCX template.
 */

import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';

async function analyzeTables() {
  const templatePath = path.join(__dirname, '../data/template/gutachten-template.docx');
  const buffer = fs.readFileSync(templatePath);
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file('word/document.xml')?.async('string');

  if (!xml) {
    console.error('Could not read document.xml');
    return;
  }

  // Find all tables
  const tablePattern = /<w:tbl>[\s\S]*?<\/w:tbl>/g;
  const tables = xml.match(tablePattern) || [];

  console.log(`Found ${tables.length} tables in document\n`);

  tables.forEach((table, i) => {
    // Count rows
    const rows = (table.match(/<w:tr>/g) || []).length;

    // Extract text from table cells
    const textPattern = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    const texts: string[] = [];
    let match;
    while ((match = textPattern.exec(table)) !== null) {
      if (match[1].trim()) texts.push(match[1].trim());
    }

    // Check for highlights
    const hasCyan = table.includes('cyan');
    const hasYellow = table.includes('yellow');

    // Check for specific placeholder patterns
    const hasDoubleCurly = table.includes('{{');
    const hasSingleCurly = /\{[^{]/.test(table);

    // Look for modernization keywords
    const isModernization = table.includes('Modernisierung') ||
                           table.includes('Dacherneuerung') ||
                           table.includes('Punkte');

    console.log(`${'═'.repeat(60)}`);
    console.log(`TABLE ${i + 1}`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`Rows: ${rows}`);
    console.log(`Highlights: ${hasCyan ? 'CYAN ' : ''}${hasYellow ? 'YELLOW' : ''}`);
    console.log(`Placeholders: ${hasDoubleCurly ? '{{...}} ' : ''}${hasSingleCurly ? '{...}' : ''}`);
    console.log(`Is Modernization Table: ${isModernization ? 'YES' : 'no'}`);
    console.log(`\nText content (first 20 items):`);
    texts.slice(0, 20).forEach((t, j) => {
      console.log(`  ${j + 1}. "${t}"`);
    });
    console.log('');
  });

  // Now let's look at the modernization table specifically
  const modTable = tables.find(t => t.includes('Dacherneuerung'));
  if (modTable) {
    console.log(`${'═'.repeat(60)}`);
    console.log('MODERNIZATION TABLE - DETAILED ANALYSIS');
    console.log(`${'═'.repeat(60)}`);

    // Extract all cells with their text
    const cellPattern = /<w:tc>([\s\S]*?)<\/w:tc>/g;
    const cells: string[] = [];
    let cellMatch;
    while ((cellMatch = cellPattern.exec(modTable)) !== null) {
      const cellContent = cellMatch[1];
      const textPattern2 = /<w:t[^>]*>([^<]*)<\/w:t>/g;
      let cellText = '';
      let textMatch;
      while ((textMatch = textPattern2.exec(cellContent)) !== null) {
        cellText += textMatch[1];
      }
      cells.push(cellText.trim() || '(empty)');
    }

    console.log(`Total cells: ${cells.length}`);
    console.log('\nCell contents:');
    cells.forEach((c, j) => {
      console.log(`  Cell ${j + 1}: "${c}"`);
    });

    // Look for the Punkte values specifically
    console.log('\n--- Looking for Punkte values ---');
    const punkteValues = cells.filter(c => /^\d+,\d+$/.test(c) || c === 'Punkte');
    console.log('Found Punkte-like values:', punkteValues);
  }
}

async function checkExportedTable() {
  // First check local test exports, then Downloads
  const localDir = path.join(__dirname, '..');
  let latestExport = '';

  // Check for local test-export files first
  const localFiles = fs.readdirSync(localDir)
    .filter(f => f.startsWith('test-export-') && f.endsWith('.docx'))
    .map(f => ({ name: f, time: fs.statSync(path.join(localDir, f)).mtime }))
    .sort((a, b) => b.time.getTime() - a.time.getTime());

  if (localFiles.length > 0) {
    latestExport = path.join(localDir, localFiles[0].name);
  } else {
    // Fallback to Downloads
    const downloadsPath = 'C:\\Users\\Niklas\\Downloads';
    const files = fs.readdirSync(downloadsPath)
      .filter(f => f.startsWith('gutachten-rnd-') && f.endsWith('.docx'))
      .map(f => ({ name: f, time: fs.statSync(path.join(downloadsPath, f)).mtime }))
      .sort((a, b) => b.time.getTime() - a.time.getTime());

    if (files.length === 0) {
      console.log('No exported files found');
      return;
    }
    latestExport = path.join(downloadsPath, files[0].name);
  }
  console.log('\n' + '═'.repeat(60));
  console.log('CHECKING EXPORTED DOCUMENT');
  console.log('═'.repeat(60));
  console.log('File:', latestExport);

  const buffer = fs.readFileSync(latestExport);
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file('word/document.xml')?.async('string');

  if (!xml) {
    console.log('Could not read document.xml');
    return;
  }

  // Find modernization table
  const tablePattern = /<w:tbl>[\s\S]*?<\/w:tbl>/g;
  const tables = xml.match(tablePattern) || [];
  const modTable = tables.find(t => t.includes('Dacherneuerung'));

  if (!modTable) {
    console.log('Modernization table not found');
    return;
  }

  // Extract cells
  const cellPattern = /<w:tc>([\s\S]*?)<\/w:tc>/g;
  const cells: string[] = [];
  let m;
  while ((m = cellPattern.exec(modTable)) !== null) {
    const textPattern2 = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let text = '';
    let tm;
    while ((tm = textPattern2.exec(m[1])) !== null) {
      text += tm[1];
    }
    cells.push(text.trim());
  }

  console.log('\nModernization table Punkte cells in EXPORTED doc:');
  const labels = ['Dach', 'Fenster', 'Leitungen', 'Heizung', 'Wände', 'Bäder', 'Innenausbau', 'Grundriss'];
  // Expected for Subowiak test data:
  // roofRenewal: 0*0=0, window: 1*0.5=0.5, plumbing: 0*0=0, heating: 1*0.5=0.5
  // walls: 0*0=0, bath: 0*0=0, interior: 2*0.5=1, floorplan: 0*0=0
  const expected = ['0,0', '0,5', '0,0', '0,5', '0,0', '0,0', '1,0', '0,0'];
  // Cell indices: 10, 13, 16, 19, 22, 25, 28, 31 (1-indexed in output above)
  // So 0-indexed: 9, 12, 15, 18, 21, 24, 27, 30
  const punkteIndices = [9, 12, 15, 18, 21, 24, 27, 30];

  let allCorrect = true;
  punkteIndices.forEach((idx, i) => {
    const actual = cells[idx] || '???';
    const exp = expected[i];
    const isCorrect = actual === exp;
    if (!isCorrect) allCorrect = false;
    const status = isCorrect ? '✓' : '✗';
    console.log(`  ${status} ${labels[i]}: ${actual} (expected: ${exp})`);
  });

  console.log('');
  if (allCorrect) {
    console.log('✓ ALL MODERNIZATION VALUES CORRECT!');
  } else {
    console.log('✗ Some values still incorrect');
  }

  // Also check if total points is correct
  console.log('\nTotal points (2,0 expected for Subowiak):');
  const allText = cells.join(' ');
  if (allText.includes('2,0')) {
    console.log('  ✓ Found "2,0" in table');
  } else {
    console.log('  ✗ "2,0" not found');
  }
}

analyzeTables()
  .then(() => checkExportedTable())
  .catch(console.error);
