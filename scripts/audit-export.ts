/**
 * Audit script for Maria Knoop DOCX export.
 *
 * Checks if all placeholders were correctly replaced.
 *
 * Usage: npx tsx scripts/audit-export.ts [path-to-exported.docx]
 */

import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';
import {
  DOUBLE_CURLY_MAP,
  createSingleCurlyMap,
  createBracketBlockMap,
  calculateDerivedValues,
} from '../lib/placeholder-map';
import type { GutachtenData } from '../lib/schema';

// ANSI colors for terminal output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

interface AuditResult {
  placeholder: string;
  type: 'double-curly' | 'single-curly' | 'bracket-block';
  expected: string;
  found: boolean;
  templateValueStillPresent: boolean;
}

async function auditExport(docxPath: string, testDataPath: string) {
  console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  MARIA KNOOP EXPORT AUDIT${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}\n`);

  // Load test data
  console.log(`${CYAN}Loading test data...${RESET}`);
  const testData: GutachtenData = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));
  console.log(`  Client: ${testData.client.name}`);
  console.log(`  City: ${testData.property.city}`);
  console.log(`  Year: ${testData.building.yearBuilt}`);
  console.log(`  RND: ${testData.calculation.restnutzungsdauerYears} Jahre\n`);

  // Load exported DOCX
  console.log(`${CYAN}Loading exported DOCX...${RESET}`);
  const docxBuffer = fs.readFileSync(docxPath);
  const zip = await JSZip.loadAsync(docxBuffer);
  const documentXml = await zip.file('word/document.xml')?.async('string');

  if (!documentXml) {
    console.error(`${RED}ERROR: Could not read document.xml from DOCX${RESET}`);
    process.exit(1);
  }

  // Extract all text content for analysis
  const textPattern = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let allText = '';
  let match;
  while ((match = textPattern.exec(documentXml)) !== null) {
    allText += match[1];
  }

  console.log(`  Document size: ${documentXml.length} chars`);
  console.log(`  Text content: ${allText.length} chars\n`);

  const results: AuditResult[] = [];
  const derived = calculateDerivedValues(testData);

  // ═══════════════════════════════════════════════════════════════
  // AUDIT DOUBLE-CURLY PLACEHOLDERS
  // ═══════════════════════════════════════════════════════════════
  console.log(`${BOLD}${CYAN}══ DOUBLE-CURLY PLACEHOLDERS {{...}} ══${RESET}\n`);

  for (const [varName, getter] of Object.entries(DOUBLE_CURLY_MAP)) {
    const expectedValue = getter(testData);
    const templatePlaceholder = `{{${varName}}}`;

    const placeholderStillPresent = allText.includes(templatePlaceholder) ||
      allText.includes(varName); // Check if var name appears (might be split)
    const valueFound = allText.includes(expectedValue);

    results.push({
      placeholder: templatePlaceholder,
      type: 'double-curly',
      expected: expectedValue,
      found: valueFound,
      templateValueStillPresent: placeholderStillPresent,
    });

    const status = valueFound && !placeholderStillPresent
      ? `${GREEN}✓ PASS${RESET}`
      : placeholderStillPresent
        ? `${RED}✗ FAIL (placeholder still present)${RESET}`
        : `${YELLOW}? WARN (value not found)${RESET}`;

    console.log(`  ${status} ${templatePlaceholder}`);
    console.log(`       Expected: "${expectedValue}"`);
    if (!valueFound) {
      console.log(`       ${YELLOW}Value not found in document${RESET}`);
    }
    console.log();
  }

  // ═══════════════════════════════════════════════════════════════
  // AUDIT SINGLE-CURLY PLACEHOLDERS
  // ═══════════════════════════════════════════════════════════════
  console.log(`${BOLD}${CYAN}══ SINGLE-CURLY PLACEHOLDERS {...} ══${RESET}\n`);

  const singleCurlyMap = createSingleCurlyMap(testData);

  for (const [templateValue, expectedValue] of singleCurlyMap) {
    if (templateValue === expectedValue) continue; // Skip if same

    const templateStillPresent = allText.includes(templateValue);
    const valueFound = allText.includes(expectedValue);

    results.push({
      placeholder: `{${templateValue}}`,
      type: 'single-curly',
      expected: expectedValue,
      found: valueFound,
      templateValueStillPresent: templateStillPresent,
    });

    const status = valueFound && !templateStillPresent
      ? `${GREEN}✓ PASS${RESET}`
      : templateStillPresent && !valueFound
        ? `${RED}✗ FAIL (not replaced)${RESET}`
        : templateStillPresent && valueFound
          ? `${YELLOW}? PARTIAL (both present)${RESET}`
          : `${YELLOW}? WARN${RESET}`;

    console.log(`  ${status} "${templateValue}" → "${expectedValue}"`);
  }
  console.log();

  // ═══════════════════════════════════════════════════════════════
  // AUDIT BRACKET BLOCKS
  // ═══════════════════════════════════════════════════════════════
  console.log(`${BOLD}${CYAN}══ BRACKET BLOCKS [...] ══${RESET}\n`);

  const bracketMap = createBracketBlockMap(testData);

  for (const [templateValue, expectedValue] of bracketMap) {
    if (templateValue === expectedValue) continue;

    // Check first 50 chars of each for matching
    const templateSnippet = templateValue.substring(0, 50);
    const expectedSnippet = expectedValue.substring(0, 50);

    const templateStillPresent = allText.includes(templateSnippet);
    const valueFound = allText.includes(expectedSnippet);

    results.push({
      placeholder: `[${templateSnippet}...]`,
      type: 'bracket-block',
      expected: expectedSnippet + '...',
      found: valueFound,
      templateValueStillPresent: templateStillPresent,
    });

    const status = valueFound
      ? `${GREEN}✓ PASS${RESET}`
      : templateStillPresent
        ? `${RED}✗ FAIL (not replaced)${RESET}`
        : `${YELLOW}? WARN${RESET}`;

    console.log(`  ${status} [${templateSnippet.substring(0, 40)}...]`);
    if (!valueFound && expectedSnippet !== templateSnippet) {
      console.log(`       Expected: "${expectedSnippet.substring(0, 40)}..."`);
    }
  }
  console.log();

  // ═══════════════════════════════════════════════════════════════
  // DERIVED VALUES CHECK
  // ═══════════════════════════════════════════════════════════════
  console.log(`${BOLD}${CYAN}══ DERIVED VALUES ══${RESET}\n`);

  console.log(`  Modified Year (fiktives Baujahr): ${derived.modifiedYear}`);
  console.log(`    Present in doc: ${allText.includes(String(derived.modifiedYear)) ? GREEN + '✓' : RED + '✗'}${RESET}`);

  console.log(`  Total Modernization Points: ${derived.totalPointsFormatted}`);
  console.log(`    Present in doc: ${allText.includes(derived.totalPointsFormatted) ? GREEN + '✓' : RED + '✗'}${RESET}`);
  console.log();

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════
  console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  SUMMARY${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════════════════════════${RESET}\n`);

  const passed = results.filter(r => r.found && !r.templateValueStillPresent).length;
  const failed = results.filter(r => r.templateValueStillPresent && !r.found).length;
  const warnings = results.filter(r => !r.found || (r.found && r.templateValueStillPresent)).length;

  console.log(`  ${GREEN}Passed:${RESET}   ${passed}`);
  console.log(`  ${RED}Failed:${RESET}   ${failed}`);
  console.log(`  ${YELLOW}Warnings:${RESET} ${warnings}`);
  console.log(`  Total:    ${results.length}`);
  console.log();

  // List failures
  if (failed > 0) {
    console.log(`${RED}${BOLD}FAILURES:${RESET}`);
    results
      .filter(r => r.templateValueStillPresent && !r.found)
      .forEach(r => {
        console.log(`  - ${r.placeholder}`);
      });
    console.log();
  }

  // ═══════════════════════════════════════════════════════════════
  // SPOT CHECK: Key values that MUST be correct
  // ═══════════════════════════════════════════════════════════════
  console.log(`${BOLD}${CYAN}══ SPOT CHECK: Critical Values ══${RESET}\n`);

  const criticalChecks = [
    { label: 'Client Name', value: testData.client.name },
    { label: 'Street', value: testData.property.street },
    { label: 'City', value: testData.property.city },
    { label: 'ZIP', value: testData.property.zipCode },
    { label: 'Building Year', value: String(testData.building.yearBuilt) },
    { label: 'RND (Jahre)', value: `${testData.calculation.restnutzungsdauerYears} Jahre` },
    { label: 'Unit Type', value: testData.property.unitType },
    { label: 'Valuation Date', value: testData.dates.valuationDate },
  ];

  for (const check of criticalChecks) {
    const found = allText.includes(check.value);
    const status = found ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
    console.log(`  ${status} ${check.label}: "${check.value}"`);
  }
  console.log();

  // Exit with error code if failures
  if (failed > 0) {
    process.exit(1);
  }
}

// Main
const args = process.argv.slice(2);
const docxPath = args[0] || path.join(__dirname, '../exports/latest.docx');
const testDataPath = args[1] || path.join(__dirname, '../data/test-subowiak-merged.json');

// Check if we should look for the most recent export in Downloads
const downloadsPath = 'C:\\Users\\Niklas\\Downloads';
const files = fs.readdirSync(downloadsPath)
  .filter(f => f.startsWith('gutachten-rnd-') && f.endsWith('.docx'))
  .map(f => ({ name: f, time: fs.statSync(path.join(downloadsPath, f)).mtime }))
  .sort((a, b) => b.time.getTime() - a.time.getTime());

const latestExport = files[0]
  ? path.join(downloadsPath, files[0].name)
  : docxPath;

console.log(`Using export: ${latestExport}\n`);

auditExport(latestExport, testDataPath).catch(console.error);
