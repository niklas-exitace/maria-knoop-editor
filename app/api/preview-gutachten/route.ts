import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import type { GutachtenData } from '../../../lib/schema';
import { applyAllReplacements } from '../../../lib/docx-replacements';

/**
 * Preview Gutachten as HTML with text replacements applied.
 *
 * POST /api/preview-gutachten
 * Body: { data: GutachtenData }
 * Returns: { html: string }
 */

interface PreviewRequest {
  data: GutachtenData;
}

export async function POST(request: NextRequest) {
  try {
    const body: PreviewRequest = await request.json();
    const { data } = body;

    if (!data) {
      return NextResponse.json(
        { error: 'Missing data in request body' },
        { status: 400 }
      );
    }

    // Load template DOCX (Maria Knoop v2)
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
        { error: 'Template DOCX not found', path: templatePath },
        { status: 404 }
      );
    }

    // Load DOCX as ZIP
    const zip = await JSZip.loadAsync(templateBuffer);

    // Process document.xml with new replacement engine
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

    // Generate modified DOCX buffer
    const modifiedBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // Convert to HTML using mammoth
    const result = await mammoth.convertToHtml(
      { buffer: modifiedBuffer },
      {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
        ],
      }
    );

    // Add some basic styling wrapper
    const styledHtml = `
      <div class="gutachten-preview">
        ${result.value}
      </div>
    `;

    return NextResponse.json({
      html: styledHtml,
      messages: result.messages,
    });
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: 'Preview failed', details: String(error) },
      { status: 500 }
    );
  }
}
