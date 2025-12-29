/**
 * Page count estimation for Gutachten documents.
 *
 * Estimates the number of pages based on content length and structure.
 * Used to populate the cover page "Textteil mit (X) Seiten, Anlagen mit (Y) Seiten".
 */

import type { GutachtenData } from './schema';

/**
 * Page estimation result.
 */
export interface PageEstimate {
  textPages: number;
  annexPages: number;
  totalPages: number;
  breakdown: {
    baseStructure: number;
    narrativeOverflow: number;
    photoPages: number;
    documentPages: number;
  };
}

/**
 * Constants for page estimation.
 */
const ESTIMATION_CONFIG = {
  // Base pages for fixed document structure
  baseTextPages: 12,

  // Characters per page for narrative overflow calculation
  charsPerPage: 2800,

  // Base annex pages (table of contents, standard appendices)
  baseAnnexPages: 6,

  // Photos per page in annexes
  photosPerPage: 4,

  // Extra pages for energy certificate, floor plan, etc.
  documentPagesBase: 3,
};

/**
 * Estimate page counts based on content.
 *
 * @param data - Gutachten data
 * @returns Page estimation with breakdown
 */
export function estimatePageCount(data: GutachtenData): PageEstimate {
  const config = ESTIMATION_CONFIG;

  // Calculate narrative text length
  const narrativeText = Object.values(data.narratives || {}).join(' ');
  const narrativeLength = narrativeText.length;

  // Base narrative is already accounted for in baseTextPages
  // Only count overflow beyond expected ~5000 chars
  const expectedNarrativeChars = 5000;
  const overflowChars = Math.max(0, narrativeLength - expectedNarrativeChars);
  const narrativeOverflow = Math.ceil(overflowChars / config.charsPerPage);

  // Calculate photo pages
  const photoCount = data.assets?.photos?.length || 0;
  const photoPages = Math.ceil(photoCount / config.photosPerPage);

  // Document pages (energy cert, floor plan, etc.)
  const hasEnergyCert = !!data.assets?.energyCertificate;
  const hasFloorplan = !!data.assets?.floorplan;
  const documentPages = config.documentPagesBase +
    (hasEnergyCert ? 1 : 0) +
    (hasFloorplan ? 1 : 0);

  // Calculate totals
  const textPages = config.baseTextPages + narrativeOverflow;
  const annexPages = config.baseAnnexPages + photoPages + documentPages;

  return {
    textPages,
    annexPages,
    totalPages: textPages + annexPages,
    breakdown: {
      baseStructure: config.baseTextPages,
      narrativeOverflow,
      photoPages,
      documentPages,
    },
  };
}

/**
 * Format page count for display in document.
 *
 * @param estimate - Page estimation result
 * @returns Formatted strings for template replacement
 */
export function formatPageCounts(estimate: PageEstimate): {
  textPagesLabel: string;
  annexPagesLabel: string;
  totalLabel: string;
} {
  return {
    textPagesLabel: `(${estimate.textPages}) Seiten`,
    annexPagesLabel: `(${estimate.annexPages}) Seiten`,
    totalLabel: `${estimate.totalPages} Seiten`,
  };
}

/**
 * Create page count replacement map.
 *
 * Maps template placeholders to calculated values.
 *
 * @param data - Gutachten data
 * @returns Map of replacements
 */
export function createPageCountMap(data: GutachtenData): Map<string, string> {
  const estimate = estimatePageCount(data);
  const map = new Map<string, string>();

  // If document section has explicit values, use those
  if (data.document?.textPages) {
    map.set('(14) Seiten', `(${data.document.textPages}) Seiten`);
    map.set('14 Seiten', `${data.document.textPages} Seiten`);
  } else {
    // Use estimated values
    map.set('(14) Seiten', `(${estimate.textPages}) Seiten`);
    map.set('14 Seiten', `${estimate.textPages} Seiten`);
  }

  if (data.document?.annexPages) {
    map.set('(15) Seiten', `(${data.document.annexPages}) Seiten`);
    map.set('15 Seiten', `${data.document.annexPages} Seiten`);
  } else {
    map.set('(15) Seiten', `(${estimate.annexPages}) Seiten`);
    map.set('15 Seiten', `${estimate.annexPages} Seiten`);
  }

  return map;
}

/**
 * Log page estimation details for debugging.
 */
export function logPageEstimation(data: GutachtenData): void {
  const estimate = estimatePageCount(data);
  console.log('Page Estimation:');
  console.log(`  Text pages: ${estimate.textPages}`);
  console.log(`    - Base structure: ${estimate.breakdown.baseStructure}`);
  console.log(`    - Narrative overflow: ${estimate.breakdown.narrativeOverflow}`);
  console.log(`  Annex pages: ${estimate.annexPages}`);
  console.log(`    - Photo pages: ${estimate.breakdown.photoPages}`);
  console.log(`    - Document pages: ${estimate.breakdown.documentPages}`);
  console.log(`  Total: ${estimate.totalPages}`);
}
