import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

/**
 * GET /api/test-case
 * Returns the Subowiak test case JSON for loading into the editor.
 */
export async function GET() {
  try {
    const testCasePath = path.join(process.cwd(), 'data', 'test-subowiak-merged.json');

    if (!fs.existsSync(testCasePath)) {
      return NextResponse.json(
        { error: 'Test case not found', path: testCasePath },
        { status: 404 }
      );
    }

    const data = JSON.parse(fs.readFileSync(testCasePath, 'utf-8'));

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load test case', details: String(error) },
      { status: 500 }
    );
  }
}
