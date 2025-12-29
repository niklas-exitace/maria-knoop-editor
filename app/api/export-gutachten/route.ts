import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';
import type { GutachtenData } from '../../../lib/schema';
import { applyAllReplacements } from '../../../lib/docx-replacements';
import { injectImages } from '../../../lib/image-injection';
import { createPageCountMap, logPageEstimation } from '../../../lib/page-estimation';

/**
 * Export Gutachten as DOCX with text replacements applied.
 *
 * POST /api/export-gutachten
 * Body: { data: GutachtenData }
 * Returns: DOCX file (or PDF in future)
 */

interface ExportRequest {
  data: GutachtenData;
  format?: 'docx' | 'pdf';
}

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequest = await request.json();
    const { data, format = 'docx' } = body;

    if (!data) {
      return NextResponse.json(
        { error: 'Missing data in request body' },
        { status: 400 }
      );
    }

    // Load template DOCX (Maria Knoop v2 template)
    const templatePath = path.join(
      process.cwd(),
      'data',
      'template',
      'gutachten-template.docx'
    );

    let templateBuffer: Buffer;
    try {
      templateBuffer = fs.readFileSync(templatePath);
    } catch {
      return NextResponse.json(
        {
          error: 'Template DOCX not found',
          hint: 'Expected at data/template/gutachten-template.docx',
          path: templatePath,
        },
        { status: 404 }
      );
    }

    // Load DOCX as ZIP
    const zip = await JSZip.loadAsync(templateBuffer);

    console.log('Applying replacements for:', data.client?.name);

    // Process document.xml (main content)
    const documentXml = await zip.file('word/document.xml')?.async('string');
    if (documentXml) {
      const modifiedDocument = applyAllReplacements(documentXml, data);
      zip.file('word/document.xml', modifiedDocument);
    }

    // Process headers and footers
    const files = Object.keys(zip.files);
    for (const filename of files) {
      if (
        filename.startsWith('word/header') ||
        filename.startsWith('word/footer')
      ) {
        const content = await zip.file(filename)?.async('string');
        if (content) {
          const modified = applyAllReplacements(content, data);
          zip.file(filename, modified);
        }
      }
    }

    // Apply page count replacements (after text processing, before image injection)
    const pageCountMap = createPageCountMap(data);
    logPageEstimation(data);

    // Re-process document.xml with page counts
    const docWithPageCounts = await zip.file('word/document.xml')?.async('string');
    if (docWithPageCounts) {
      let updated = docWithPageCounts;
      for (const [placeholder, replacement] of pageCountMap) {
        updated = updated.split(placeholder).join(replacement);
      }
      zip.file('word/document.xml', updated);
    }

    // Inject images (replace placeholder images with actual photos)
    await injectImages(zip, data);

    // Generate output DOCX
    const outputBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    // For now, return DOCX directly
    // TODO: Add PDF conversion via LibreOffice or external service
    if (format === 'pdf') {
      // PDF conversion not yet implemented
      // Return DOCX with a note
      console.log('PDF format requested but not yet implemented, returning DOCX');
    }

    const filename = `gutachten-rnd-${data.property.city.toLowerCase().replace(/[^a-z0-9]/g, '-')}.docx`;

    // Convert to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(outputBuffer);

    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Export failed', details: String(error) },
      { status: 500 }
    );
  }
}
