import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export interface CaseSummary {
  id: string;
  client: string;
  street: string;
  city: string;
  yearBuilt: number;
  label: string;
}

export async function GET() {
  try {
    const casesDir = path.join(process.cwd(), 'data', 'cases-json');
    const files = fs.readdirSync(casesDir).filter(f => f.endsWith('.json'));

    const cases: CaseSummary[] = [];

    for (const file of files) {
      const filePath = path.join(casesDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      const id = file.replace('.json', '');
      const client = data.client?.name || 'Unknown';
      const street = data.property?.street || '';
      const city = data.property?.city || '';
      const yearBuilt = data.building?.yearBuilt || 0;

      cases.push({
        id,
        client,
        street,
        city,
        yearBuilt,
        label: `${client} - ${street}, ${city} (${yearBuilt})`,
      });
    }

    // Sort by client name, then street
    cases.sort((a, b) => {
      const clientCompare = a.client.localeCompare(b.client);
      if (clientCompare !== 0) return clientCompare;
      return a.street.localeCompare(b.street);
    });

    return NextResponse.json({ cases });
  } catch (error) {
    console.error('Error loading cases:', error);
    return NextResponse.json(
      { error: 'Failed to load cases' },
      { status: 500 }
    );
  }
}
