/**
 * DOCX placeholder replacement for Maria Knoop v2 template.
 *
 * Handles three placeholder types:
 * 1. Double-curly: {{variable_name}}
 * 2. Single-curly: {sample_value}
 * 3. Bracket blocks: [narrative text]
 */

import type { GutachtenData } from './schema';
import {
  DOUBLE_CURLY_MAP,
  createSingleCurlyMap,
  createBracketBlockMap,
} from './placeholder-map';

/**
 * Apply all placeholder replacements to DOCX XML content.
 */
export function applyAllReplacements(
  xml: string,
  data: GutachtenData
): string {
  let result = xml;

  // Pre-pass: Clean [MANUELL: ...] placeholders from data
  const cleanedData = cleanManualPlaceholders(data);

  // Pass 0: Normalize split placeholders (merge adjacent runs)
  result = normalizeSplitPlaceholders(result);

  // Pass 1: Double-curly placeholders {{variable}}
  result = replaceDoubleCurlyPlaceholders(result, cleanedData);

  // Pass 2: Single-curly placeholders {sample_value}
  const singleCurlyMap = createSingleCurlyMap(cleanedData);
  result = replaceSingleCurlyPlaceholders(result, singleCurlyMap);

  // Pass 3: Bracket blocks [narrative]
  const bracketMap = createBracketBlockMap(cleanedData);
  result = replaceBracketBlocks(result, bracketMap);

  // Pass 4: Modernization table (positional cell replacement)
  result = replaceModernizationTable(result, cleanedData);

  // Pass 5: Remove yellow highlighting (cleanup after replacements)
  result = removeHighlighting(result);

  // Pass 6: Final cleanup - remove any remaining placeholder patterns
  result = cleanupRemainingPlaceholders(result);

  return result;
}

/**
 * Clean [MANUELL: ...] placeholders from data.
 * Replace with sensible defaults or empty strings.
 */
function cleanManualPlaceholders(data: GutachtenData): GutachtenData {
  const clean = (val: string): string => {
    if (!val) return val;
    // Replace [MANUELL: ...] patterns with empty or default
    if (val.startsWith('[MANUELL:') || val.startsWith('[MANUELL ')) {
      return ''; // Will be handled by default values below
    }
    return val;
  };

  // Deep clone and clean
  const cleaned = JSON.parse(JSON.stringify(data)) as GutachtenData;

  // Property
  if (clean(cleaned.property.unitPosition) === '') {
    cleaned.property.unitPosition = 'k. A.';
  }

  // Dates
  if (clean(cleaned.dates.inspectionDate) === '') {
    cleaned.dates.inspectionDate = cleaned.dates.valuationDate || 'k. A.';
  }

  // Inspection
  if (clean(cleaned.inspection.attendees) === '') {
    cleaned.inspection.attendees = 'Der Eigentümer';
  }
  if (clean(cleaned.inspection.areasVisited) === '') {
    cleaned.inspection.areasVisited = 'Wohnräume, Küche, Bad, Treppenhaus';
  }

  // Narratives
  if (clean(cleaned.narratives.overallCondition) === '') {
    cleaned.narratives.overallCondition = 'Der Gesamtzustand des Objektes entspricht dem Alter und der bisherigen Nutzung.';
  }
  if (clean(cleaned.narratives.defects) === '') {
    cleaned.narratives.defects = 'Wesentliche Bauschäden konnten während der Besichtigung nicht festgestellt werden.';
  }
  if (clean(cleaned.narratives.otherNotes) === '') {
    cleaned.narratives.otherNotes = 'Weitere bautechnische Beanstandungen konnten während des Ortstermins nicht festgestellt werden.';
  }

  // Components
  if (clean(cleaned.components.sanitaryInstallation) === '') {
    cleaned.components.sanitaryInstallation = 'Durchschnittliche Ausstattung';
  }
  if (clean(cleaned.components.electricalInstallation) === '') {
    cleaned.components.electricalInstallation = 'Durchschnittliche Ausstattung';
  }
  if (clean(cleaned.components.specialFeatures) === '') {
    cleaned.components.specialFeatures = '-';
  }

  return cleaned;
}

/**
 * Remove any remaining placeholder patterns from the final output.
 * This catches anything that wasn't explicitly mapped.
 */
function cleanupRemainingPlaceholders(xml: string): string {
  let result = xml;

  // Remove [MANUELL: ...] patterns (in case any slipped through)
  result = result.replace(/\[MANUELL:[^\]]*\]/g, '');

  // Remove remaining {{ ... }} patterns (unfilled double-curly)
  result = result.replace(/\{\{\s*[a-z_]+\s*\}\}/gi, '');

  // Remove ALL remaining [...] bracket blocks that look like template placeholders
  // These are narrative blocks from the template that weren't matched exactly
  // Match brackets containing text (at least 10 chars to avoid removing short refs like [1])
  result = result.replace(/\[[^\]]{10,}\]/g, (match) => {
    // Extract the content without brackets
    const content = match.slice(1, -1);
    // Return content without brackets (the text is good, just remove the brackets)
    return content;
  });

  // Remove remaining { ... } single curly patterns that look like placeholders
  // Be careful not to remove legitimate text - only remove patterns that look like placeholders
  result = result.replace(/\{\s*[A-Za-z0-9_\-.,\s]+\s*\}/g, (match) => {
    // Keep if it looks like a real value (dates, numbers, etc.)
    if (/^\{\s*\d{2}\.\d{2}\.\d{4}\s*\}$/.test(match)) return match; // Date
    if (/^\{\s*\d+[,.]?\d*\s*(J|Jahre|m²|EUR)?\s*\}$/.test(match)) return match; // Number with unit
    // Remove brackets but keep content if it looks like actual text
    const content = match.slice(1, -1).trim();
    if (content.length > 20) return content; // Long text - keep it, just remove braces
    // Remove if it looks like a placeholder
    return '';
  });

  return result;
}

/**
 * Normalize split placeholders by merging adjacent runs.
 * Word often splits {{placeholder}} across multiple <w:r> elements like:
 *   <w:r><w:t>{{</w:t></w:r><w:r><w:t>name</w:t></w:r><w:r><w:t>}}</w:t></w:r>
 * This merges them into a single run for easier replacement.
 */
function normalizeSplitPlaceholders(xml: string): string {
  // Pattern: find sequences of runs that together form {{...}}
  // Look for <w:t>{{</w:t> followed eventually by <w:t>}}</w:t>
  // and merge all the text content in between

  let result = xml;

  // For each known placeholder, try to find and merge its split form
  const placeholderNames = [
    'client_name',
    'object_street',
    'object_zip',
    'object_town',
    'object_appraise_date',
    'object_visit_date',
  ];

  for (const name of placeholderNames) {
    // Build a pattern that matches the split structure
    // {{</w:t></w:r>...<w:r>...<w:t>name</w:t></w:r>...<w:r>...<w:t>}}
    const splitPattern = new RegExp(
      // Opening {{ in its own <w:t>
      `(<w:r[^>]*>\\s*<w:rPr>.*?</w:rPr>\\s*<w:t[^>]*>)\\{\\{(</w:t>\\s*</w:r>)` +
      // Middle run(s) containing the variable name
      `(\\s*<w:r[^>]*>\\s*<w:rPr>.*?</w:rPr>\\s*<w:t[^>]*>)(${name})(</w:t>\\s*</w:r>)` +
      // Closing }} in its own <w:t>
      `(\\s*<w:r[^>]*>\\s*<w:rPr>.*?</w:rPr>\\s*<w:t[^>]*>)\\}\\}(</w:t>\\s*</w:r>)`,
      'gs'
    );

    result = result.replace(splitPattern, (match, p1, p2, p3, varName, p5, p6, p7) => {
      // Keep the first run's structure but put the full placeholder in it
      return `${p1}{{${varName}}}${p2.replace('</w:t>', '</w:t><!-- merged -->')}`;
    });
  }

  // Simpler fallback: direct text concatenation approach
  // Find any {{...}} that's split and merge the text parts
  result = mergeSplitBraces(result);

  return result;
}

/**
 * Merge text content of adjacent runs that form {{placeholder}}.
 * Works by finding patterns where {{ and }} are in separate <w:t> elements.
 */
function mergeSplitBraces(xml: string): string {
  // Extract all <w:t> content, find {{...}} patterns across them, and reconstruct
  // This is a simplified approach that puts the merged text in the first element

  // Find opening {{ that's alone in a <w:t>
  const openPattern = /<w:t[^>]*>\{\{<\/w:t>/g;
  let result = xml;

  let match;
  let iterations = 0;
  const maxIterations = 50;

  while ((match = openPattern.exec(result)) !== null && iterations < maxIterations) {
    iterations++;
    const startIdx = match.index;

    // Find the next few <w:t> elements after this one
    const afterOpen = result.substring(startIdx + match[0].length);

    // Look for the closing }} within a reasonable distance
    const closeMatch = afterOpen.match(/<w:t[^>]*>\}\}<\/w:t>/);
    if (!closeMatch) continue;

    const closeIdx = startIdx + match[0].length + (closeMatch.index ?? 0);

    // Extract all text between {{ and }}
    const between = result.substring(startIdx + match[0].length, closeIdx);
    const textBetween = between.replace(/<[^>]+>/g, '');

    // Only proceed if the text between looks like a variable name
    if (!/^[a-z_]+$/i.test(textBetween.trim())) continue;

    // Replace the entire span with a single merged element
    const fullPlaceholder = `{{${textBetween.trim()}}}`;

    // Find the start of the <w:r> containing the {{
    const rStartPattern = /<w:r[^>]*>[^]*?<w:t[^>]*>\{\{<\/w:t>/;
    const beforeMatch = result.substring(0, startIdx + match[0].length);
    const rStartMatch = beforeMatch.match(/<w:r[^>]*>(?:(?!<w:r)[\s\S])*$/);

    if (rStartMatch) {
      const rStart = startIdx + match[0].length - rStartMatch[0].length;

      // Find the </w:r> after the closing }}
      const afterClose = result.substring(closeIdx);
      const rEndMatch = afterClose.match(/<\/w:t>\s*<\/w:r>/);

      if (rEndMatch) {
        const rEnd = closeIdx + (rEndMatch.index ?? 0) + rEndMatch[0].length;

        // Build a clean replacement run
        const cleanRun = `<w:r><w:t>${escapeXml(fullPlaceholder)}</w:t></w:r>`;

        result = result.substring(0, rStart) + cleanRun + result.substring(rEnd);

        // Reset pattern to search from beginning since we modified the string
        openPattern.lastIndex = 0;
      }
    }
  }

  return result;
}

/**
 * Remove template formatting (highlighting and colors).
 * Cleans up yellow/cyan/red highlighting and red placeholder text.
 *
 * Template uses:
 * - Highlights: yellow, cyan, red (w:highlight w:val="...")
 * - Colors: EE0000 (red for placeholders)
 */
function removeHighlighting(xml: string): string {
  let result = xml;

  // Remove ALL highlight tags (yellow, cyan, red, etc.)
  // Pattern: <w:highlight w:val="yellow"/> or <w:highlight w:val="cyan"/>
  result = result.replace(/<w:highlight[^>]*\/>/g, '');

  // Remove red color (EE0000) used for placeholder text
  result = result.replace(/<w:color w:val="EE0000"\/>/g, '');

  // Remove cyan/teal colors if used for markers (00FFFF, 00CCCC)
  result = result.replace(/<w:color w:val="00FFFF"\/>/g, '');
  result = result.replace(/<w:color w:val="00CCCC"\/>/g, '');

  return result;
}

/**
 * Replace {{variable_name}} placeholders.
 * Handles both {{ variable }} (with spaces) and {{variable}} (without).
 */
function replaceDoubleCurlyPlaceholders(
  xml: string,
  data: GutachtenData
): string {
  let result = xml;

  // Core variable names (without spaces)
  const coreVars: Record<string, (d: GutachtenData) => string> = {
    'client_name': (d) => d.client.name,
    'object_street': (d) => d.property.street,
    'object_zip': (d) => d.property.zipCode,
    'object_town': (d) => d.property.city,
    'object_appraise_date': (d) => d.dates.valuationDate,
    'object_visit_date': (d) => d.dates.inspectionDate,
  };

  for (const [varName, getter] of Object.entries(coreVars)) {
    const value = getter(data);
    if (!value) continue;

    const escapedValue = escapeXml(value);

    // Try all spacing variations:
    // {{ variable }}, {{variable}}, {{ variable}}, {variable }}
    const patterns = [
      `\\{\\{\\s*${varName}\\s*\\}\\}`,  // Flexible spacing
    ];

    for (const patternStr of patterns) {
      const pattern = new RegExp(patternStr, 'g');
      result = result.replace(pattern, escapedValue);
    }

    // Handle split across XML elements
    result = replaceAcrossXmlElements(result, `{{ ${varName} }}`, value);
    result = replaceAcrossXmlElements(result, `{{${varName}}}`, value);
  }

  return result;
}

/**
 * Replace {sample_value} placeholders.
 * Removes the curly braces entirely - output is clean text.
 */
function replaceSingleCurlyPlaceholders(
  xml: string,
  replacements: Map<string, string>
): string {
  let result = xml;

  for (const [original, replacement] of replacements) {
    if (!original || !replacement || original === replacement) continue;

    // Replace {original} with replacement (removes braces)
    result = replaceTextContent(result, `{${original}}`, replacement);

    // Also try without curly braces for values that appear standalone
    result = replaceTextContent(result, original, replacement);
  }

  return result;
}

/**
 * Replace [narrative block] placeholders.
 * The map keys already include the brackets, e.g., "[content here]".
 */
function replaceBracketBlocks(
  xml: string,
  replacements: Map<string, string>
): string {
  let result = xml;

  for (const [bracketedOriginal, replacement] of replacements) {
    if (!bracketedOriginal) continue;

    // The key already contains brackets, so replace directly
    // Handle empty replacement (remove the placeholder entirely)
    const replaceWith = replacement || '';

    // Direct replacement of the full bracketed text
    result = replaceTextContent(result, bracketedOriginal, replaceWith);

    // Also try via replaceAcrossXmlElements for split text
    result = replaceAcrossXmlElements(result, bracketedOriginal, replaceWith);
  }

  return result;
}

/**
 * Replace text content that may be split across multiple <w:t> elements.
 * This is the core challenge with DOCX - Word splits text arbitrarily.
 */
function replaceAcrossXmlElements(
  xml: string,
  searchText: string,
  replacement: string
): string {
  // Extract all <w:t> elements and their positions
  const textPattern = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  const segments: Array<{ start: number; end: number; text: string }> = [];

  let match;
  while ((match = textPattern.exec(xml)) !== null) {
    segments.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[1],
    });
  }

  if (segments.length === 0) return xml;

  // Build combined text
  let combinedText = '';
  for (const seg of segments) {
    combinedText += seg.text;
  }

  // Find all occurrences
  let result = xml;
  let searchIndex = 0;
  const maxReplacements = 50;
  let replacementCount = 0;

  while (replacementCount < maxReplacements) {
    const idx = combinedText.indexOf(searchText, searchIndex);
    if (idx === -1) break;

    // Find which segments contain this match
    const matchStart = idx;
    const matchEnd = idx + searchText.length;

    let startSegIdx = -1;
    let endSegIdx = -1;
    let offsetInStartSeg = 0;
    let offsetInEndSeg = 0;
    let currentTextPos = 0;

    for (let i = 0; i < segments.length; i++) {
      const segStart = currentTextPos;
      const segEnd = currentTextPos + segments[i].text.length;

      if (startSegIdx === -1 && matchStart >= segStart && matchStart < segEnd) {
        startSegIdx = i;
        offsetInStartSeg = matchStart - segStart;
      }
      if (matchEnd > segStart && matchEnd <= segEnd) {
        endSegIdx = i;
        offsetInEndSeg = matchEnd - segStart;
      }

      currentTextPos = segEnd;
    }

    if (startSegIdx === -1 || endSegIdx === -1) {
      searchIndex = idx + 1;
      continue;
    }

    // Perform replacement
    if (startSegIdx === endSegIdx) {
      // Simple case: match is within a single segment
      const seg = segments[startSegIdx];
      const newText =
        seg.text.substring(0, offsetInStartSeg) +
        replacement +
        seg.text.substring(offsetInEndSeg);

      const newElement = result
        .substring(seg.start, seg.end)
        .replace(/>([^<]*)</, `>${escapeXml(newText)}<`);

      result =
        result.substring(0, seg.start) + newElement + result.substring(seg.end);

      // Adjust segment positions for next iteration
      const lengthDiff = newElement.length - (seg.end - seg.start);
      for (let i = startSegIdx + 1; i < segments.length; i++) {
        segments[i].start += lengthDiff;
        segments[i].end += lengthDiff;
      }
      segments[startSegIdx].end += lengthDiff;
      segments[startSegIdx].text = newText;
    } else {
      // Complex case: match spans multiple segments
      // Put replacement in first segment, clear others
      let offset = 0;

      // First segment: keep prefix + add replacement
      const firstSeg = segments[startSegIdx];
      const firstNewText =
        firstSeg.text.substring(0, offsetInStartSeg) + replacement;
      const firstNewElement = result
        .substring(firstSeg.start + offset, firstSeg.end + offset)
        .replace(/>([^<]*)</, `>${escapeXml(firstNewText)}<`);
      result =
        result.substring(0, firstSeg.start + offset) +
        firstNewElement +
        result.substring(firstSeg.end + offset);
      offset += firstNewElement.length - (firstSeg.end - firstSeg.start);

      // Middle segments: clear them
      for (let i = startSegIdx + 1; i < endSegIdx; i++) {
        const seg = segments[i];
        const emptyElement = result
          .substring(seg.start + offset, seg.end + offset)
          .replace(/>([^<]*)</, '><');
        result =
          result.substring(0, seg.start + offset) +
          emptyElement +
          result.substring(seg.end + offset);
        offset += emptyElement.length - (seg.end - seg.start);
      }

      // Last segment: keep suffix only
      const lastSeg = segments[endSegIdx];
      const lastNewText = lastSeg.text.substring(offsetInEndSeg);
      const lastNewElement = result
        .substring(lastSeg.start + offset, lastSeg.end + offset)
        .replace(/>([^<]*)</, `>${escapeXml(lastNewText)}<`);
      result =
        result.substring(0, lastSeg.start + offset) +
        lastNewElement +
        result.substring(lastSeg.end + offset);
    }

    // Move past this replacement in the combined text
    searchIndex = idx + replacement.length;
    replacementCount++;

    // Re-extract segments for next iteration (positions changed)
    segments.length = 0;
    textPattern.lastIndex = 0;
    while ((match = textPattern.exec(result)) !== null) {
      segments.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[1],
      });
    }
    combinedText = segments.map((s) => s.text).join('');
  }

  return result;
}

/**
 * Simple text replacement within <w:t> elements.
 */
function replaceTextContent(
  xml: string,
  searchText: string,
  replacement: string
): string {
  if (!searchText || searchText === replacement) return xml;

  // First try: direct replacement (text not split)
  const escaped = escapeRegex(searchText);
  const pattern = new RegExp(`(>)${escaped}(<)`, 'g');
  let result = xml.replace(pattern, `$1${escapeXml(replacement)}$2`);

  // Second try: handle text split across elements
  result = replaceAcrossXmlElements(result, searchText, replacement);

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Replace modernization table Punkte cells by position.
 * The table has 8 rows of modernization measures, each with a Punkte cell.
 *
 * Table structure (from analysis):
 * - Cells 10, 13, 16, 19, 22, 25, 28, 31 (1-indexed) contain Punkte values
 * - Order: Dach, Fenster, Leitungen, Heizung, Wände, Bäder, Innenausbau, Grundriss
 */
function replaceModernizationTable(xml: string, data: GutachtenData): string {
  // Find the modernization table
  const tablePattern = /<w:tbl>[\s\S]*?<\/w:tbl>/g;
  const tables = xml.match(tablePattern) || [];
  const modTableIndex = tables.findIndex(t => t.includes('Dacherneuerung'));

  if (modTableIndex === -1) {
    // Table not in this XML file (normal for headers/footers)
    return xml;
  }

  const modTable = tables[modTableIndex];

  // Calculate the Punkte values for each row
  const fmt = (n: number) => n.toFixed(1).replace('.', ',');
  const punkteValues = [
    fmt(data.modernization.roofRenewal.points * data.modernization.roofRenewal.weight),
    fmt(data.modernization.windowModernization.points * data.modernization.windowModernization.weight),
    fmt(data.modernization.plumbingModernization.points * data.modernization.plumbingModernization.weight),
    fmt(data.modernization.heatingModernization.points * data.modernization.heatingModernization.weight),
    fmt(data.modernization.wallInsulation.points * data.modernization.wallInsulation.weight),
    fmt(data.modernization.bathroomModernization.points * data.modernization.bathroomModernization.weight),
    fmt(data.modernization.interiorModernization.points * data.modernization.interiorModernization.weight),
    fmt(data.modernization.floorPlanImprovement.points * data.modernization.floorPlanImprovement.weight),
  ];

  // Extract all cells from the table
  const cellPattern = /<w:tc>([\s\S]*?)<\/w:tc>/g;
  const cellMatches: Array<{ full: string; start: number; end: number }> = [];
  let cellMatch;

  // Get the start position of the table in the XML
  const tableStart = xml.indexOf(modTable);

  // Find cells within the table
  const tableXml = modTable;
  while ((cellMatch = cellPattern.exec(tableXml)) !== null) {
    cellMatches.push({
      full: cellMatch[0],
      start: tableStart + cellMatch.index,
      end: tableStart + cellMatch.index + cellMatch[0].length,
    });
  }

  // REBUILT v3 template cell positions:
  // Header: cells 0-4 (Maßnahme | Hinweise | empty | max. | Punkte)
  // Data rows: 3 cells each (Description | max | Punkte)
  // Punkte cells are at: 7, 10, 13, 16, 19, 22, 25, 28 (0-indexed)
  const punkteCellIndices = [7, 10, 13, 16, 19, 22, 25, 28];

  // Build the new XML with replacements
  let result = xml;
  let offset = 0;

  for (let i = 0; i < punkteCellIndices.length; i++) {
    const cellIdx = punkteCellIndices[i];
    if (cellIdx >= cellMatches.length) continue;

    const cell = cellMatches[cellIdx];
    const newValue = punkteValues[i];

    // Replace the cell content
    // Find the <w:t> element within this cell and replace its content
    const cellContent = cell.full;
    const newCellContent = cellContent.replace(
      /(<w:t[^>]*>)([^<]*)(<\/w:t>)/,
      `$1${escapeXml(newValue)}$3`
    );

    if (newCellContent !== cellContent) {
      const adjustedStart = cell.start + offset;
      const adjustedEnd = cell.end + offset;

      result =
        result.substring(0, adjustedStart) +
        newCellContent +
        result.substring(adjustedEnd);

      offset += newCellContent.length - cellContent.length;
    }
  }

  return result;
}

// Legacy exports for backward compatibility
export { applyAllReplacements as applyReplacements };

export function createReplacementMap(
  data: GutachtenData,
  _originalData: GutachtenData
): Map<string, string> {
  // For backward compatibility, create a simple map
  // The new applyAllReplacements handles everything internally
  return createSingleCurlyMap(data);
}
