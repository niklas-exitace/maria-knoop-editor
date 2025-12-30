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
  if (content.trim()) {
    console.log(`Cell ${i}: ${content.substring(0, 60)}`);
  }
});
