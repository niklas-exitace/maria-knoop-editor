const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Extract document.xml from template
const templatePath = path.join(__dirname, '..', 'data', 'template', 'gutachten-template.docx');
const xml = execSync(`unzip -p "${templatePath}" word/document.xml`).toString();

// Find the modernization table
const tables = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) || [];
const modTable = tables.find(t => t.includes('Dacherneuerung'));

if (!modTable) {
  console.log('Table not found');
  process.exit(1);
}

// Extract cells and their text content
const cells = modTable.match(/<w:tc>[\s\S]*?<\/w:tc>/g) || [];
console.log('Total cells:', cells.length);

cells.forEach((cell, i) => {
  const texts = cell.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
  const content = texts.map(t => {
    const m = t.match(/>([^<]*)</);
    return m ? m[1] : '';
  }).join('');

  // Show all punkte cells (7, 10, 13, 16, 19, 22, 25, 28)
  const punkteCells = [7, 10, 13, 16, 19, 22, 25, 28];
  if (punkteCells.includes(i)) {
    console.log(`\n=== PUNKTE Cell ${i} ===`);
    console.log('Content:', content);

    // Test the exact regex used in docx-replacements.ts
    const regex = /(<w:t[^>]*>)([^<]*)(<\/w:t>)/;
    const match = cell.match(regex);
    console.log('Regex match:', match ? `YES - found "${match[2]}"` : 'NO MATCH');

    // Show full cell for debugging
    console.log('Full cell XML:');
    console.log(cell);
    console.log('---');
  } else if (content.trim()) {
    console.log(`Cell ${i}: ${content.substring(0, 60)}`);
  }
});
