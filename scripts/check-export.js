const { execSync } = require('child_process');

const xml = execSync('unzip -p /tmp/test-export3.docx word/document.xml').toString();

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

const punkteCells = [7, 10, 13, 16, 19, 22, 25, 28];
punkteCells.forEach(i => {
  const cell = cells[i];
  if (!cell) return;
  const texts = cell.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
  const content = texts.map(t => {
    const m = t.match(/>([^<]*)</);
    return m ? m[1] : '';
  }).join('');
  console.log(`Cell ${i} (Punkte): ${content}`);
});
