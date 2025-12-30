import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Sanitize ID to prevent path traversal
    const safeId = id.replace(/[^a-zA-Z0-9\-_]/g, '');
    if (safeId !== id) {
      return NextResponse.json({ error: 'Invalid case ID' }, { status: 400 });
    }

    const casePath = path.join(process.cwd(), 'data', 'cases-json', `${safeId}.json`);

    if (!fs.existsSync(casePath)) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const data = JSON.parse(fs.readFileSync(casePath, 'utf-8'));

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error loading case:', error);
    return NextResponse.json(
      { error: 'Failed to load case' },
      { status: 500 }
    );
  }
}
