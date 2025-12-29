/**
 * Analyze image placeholders in the template.
 */

import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';

async function findImagePlaceholders() {
  const templatePath = path.join(__dirname, '../data/RND-Gutachten-Template_MariaKnoop_clean_v2.docx');
  const buffer = fs.readFileSync(templatePath);
  const zip = await JSZip.loadAsync(buffer);

  // Get relationships to map rId -> image file
  const rels = await zip.file('word/_rels/document.xml.rels')?.async('string') || '';
  const rIdToImage: Record<string, string> = {};
  const relPattern = /Id="(rId\d+)"[^>]*Target="media\/([^"]+)"/g;
  let m;
  while ((m = relPattern.exec(rels)) !== null) {
    rIdToImage[m[1]] = m[2];
  }

  // Get document and find drawings with their context
  const docXml = await zip.file('word/document.xml')?.async('string') || '';

  // Find each drawing and its surrounding context
  const drawingPattern = /<w:drawing>[\s\S]*?<\/w:drawing>/g;
  const drawings = docXml.match(drawingPattern) || [];

  console.log('═══════════════════════════════════════════════════════════');
  console.log('IMAGE PLACEHOLDERS IN TEMPLATE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total drawings: ${drawings.length}`);

  // Track which images are used
  const usedImages = new Set<string>();

  drawings.forEach((drawing, i) => {
    // Find rId in this drawing
    const rIdMatch = drawing.match(/r:embed="(rId\d+)"/);
    const rId = rIdMatch ? rIdMatch[1] : 'unknown';
    const imageFile = rIdToImage[rId] || 'unknown';
    usedImages.add(imageFile);

    // Find description/alt text
    const descMatch = drawing.match(/descr="([^"]*)"/);
    const desc = descMatch ? descMatch[1] : '';

    // Find name
    const nameMatch = drawing.match(/name="([^"]*)"/);
    const name = nameMatch ? nameMatch[1] : '';

    // Get dimensions (in EMUs - 914400 EMUs per inch)
    const cxMatch = drawing.match(/cx="(\d+)"/);
    const cyMatch = drawing.match(/cy="(\d+)"/);
    const widthInches = cxMatch ? (parseInt(cxMatch[1]) / 914400).toFixed(1) : '?';
    const heightInches = cyMatch ? (parseInt(cyMatch[1]) / 914400).toFixed(1) : '?';

    // Look for surrounding text context
    const drawingIndex = docXml.indexOf(drawing);
    const contextBefore = docXml.substring(Math.max(0, drawingIndex - 500), drawingIndex);
    const headingMatch = contextBefore.match(/<w:t[^>]*>([^<]*(?:Luftbild|Objektbild|Foto|Anlage|Karte|Google)[^<]*)<\/w:t>/i);
    const contextHint = headingMatch ? headingMatch[1] : '';

    console.log(`\n[${i + 1}] ${imageFile}`);
    console.log(`    rId: ${rId}`);
    console.log(`    Size: ${widthInches}" x ${heightInches}"`);
    console.log(`    Name: ${name || '(none)'}`);
    if (desc) console.log(`    Desc: ${desc}`);
    if (contextHint) console.log(`    Context: "${contextHint}"`);
  });

  // Show image files and their sizes
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('IMAGE FILES IN MEDIA/');
  console.log('═══════════════════════════════════════════════════════════');

  const mediaFiles = Object.keys(zip.files)
    .filter(f => f.startsWith('word/media/'))
    .sort();

  for (const file of mediaFiles) {
    const name = file.replace('word/media/', '');
    const data = await zip.file(file)?.async('nodebuffer');
    const size = data ? Math.round(data.length / 1024) : 0;
    const used = usedImages.has(name) ? '✓' : ' ';
    console.log(`  ${used} ${name.padEnd(15)} ${size.toString().padStart(5)} KB`);
  }

  // Identify likely placeholder positions
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('SUGGESTED PLACEHOLDER MAPPING');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`
Based on typical Gutachten structure:
  - Drawing 1-2: Header/logo images (keep as-is)
  - Drawing 3-4: GoogleMaps / Luftbild (replace with aerial)
  - Drawing 5+: Objektfotos (replace with property photos)

To implement image injection:
  1. Keep a mapping of which image# = which purpose
  2. Replace the bytes in word/media/imageX.jpg
  3. No need to modify relationships or XML
`);
}

findImagePlaceholders().catch(console.error);
