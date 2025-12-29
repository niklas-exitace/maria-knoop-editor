import { NextRequest, NextResponse } from 'next/server';
import type { GutachtenData } from '../../../lib/schema';

/**
 * Generate narrative text blocks using LLM.
 *
 * POST /api/generate-narratives
 * Body: { data: GutachtenData }
 * Returns: { narratives: Partial<GutachtenData['narratives']>, mock?: boolean }
 */

interface GenerateRequest {
  data: GutachtenData;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { data } = body;

    if (!data) {
      return NextResponse.json(
        { error: 'Missing data in request body' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    // If no API key, return mock data
    if (!apiKey) {
      console.log('No OPENAI_API_KEY, returning mock narratives');
      return NextResponse.json({
        narratives: generateMockNarratives(data),
        mock: true,
      });
    }

    // Build prompt for narrative generation
    const prompt = buildNarrativePrompt(data);

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: `Du bist ein Sachverständiger für Immobilienbewertung in Deutschland.
Du schreibst professionelle, präzise Texte für Restnutzungsdauer-Gutachten nach ImmoWertV.
Der Stil ist sachlich, formal und entspricht den Standards von Sachverständigengutachten.
Antworte auf Deutsch mit den angeforderten Textbausteinen im JSON-Format.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      return NextResponse.json({
        narratives: generateMockNarratives(data),
        mock: true,
        error: 'API call failed, using mock data',
      });
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json({
        narratives: generateMockNarratives(data),
        mock: true,
        error: 'Empty response from API',
      });
    }

    try {
      const narratives = JSON.parse(content);
      // Preserve the deterministic modernizationList from merger
      narratives.modernizationList = data.narratives.modernizationList;
      return NextResponse.json({ narratives, mock: false });
    } catch {
      console.error('Failed to parse LLM response:', content);
      return NextResponse.json({
        narratives: generateMockNarratives(data),
        mock: true,
        error: 'Failed to parse API response',
      });
    }
  } catch (error) {
    console.error('Narrative generation error:', error);
    return NextResponse.json(
      { error: 'Generation failed', details: String(error) },
      { status: 500 }
    );
  }
}

function buildNarrativePrompt(data: GutachtenData): string {
  const age = new Date().getFullYear() - data.building.yearBuilt;

  // Build modernization summary from points
  const modernizationSummary = [];
  if (data.modernization.roofRenewal.points > 0)
    modernizationSummary.push(`Dach: ${data.modernization.roofRenewal.points}/4 Punkte`);
  if (data.modernization.windowModernization.points > 0)
    modernizationSummary.push(`Fenster: ${data.modernization.windowModernization.points}/4 Punkte`);
  if (data.modernization.heatingModernization.points > 0)
    modernizationSummary.push(`Heizung: ${data.modernization.heatingModernization.points}/4 Punkte`);
  if (data.modernization.bathroomModernization.points > 0)
    modernizationSummary.push(`Bäder: ${data.modernization.bathroomModernization.points}/4 Punkte`);
  if (data.modernization.interiorModernization.points > 0)
    modernizationSummary.push(`Innenausbau: ${data.modernization.interiorModernization.points}/4 Punkte`);
  if (data.modernization.wallInsulation.points > 0)
    modernizationSummary.push(`Dämmung: ${data.modernization.wallInsulation.points}/4 Punkte`);

  const hasBalcony = data.components.specialFeatures?.toLowerCase().includes('balkon');

  return `
Erstelle professionelle Textbausteine für ein Restnutzungsdauer-Gutachten nach ImmoWertV.

**OBJEKTDATEN:**
- Typ: ${data.property.unitType}
- Lage im Gebäude: ${data.property.unitPosition}
- Adresse: ${data.property.street}, ${data.property.zipCode} ${data.property.city}
- Wohnfläche: ${data.areas.livingAreaM2} m²

**GEBÄUDEDATEN:**
- Baujahr: ${data.building.yearBuilt} (Alter: ${age} Jahre)
- Gebäudetyp: ${data.building.type}
- Geschosse: ${data.building.floors}
- Dachgeschoss: ${data.building.atticInfo}
- Außenwände: ${data.building.exteriorWalls}
- Dach: ${data.building.roof}
- Fenster: ${data.building.windows}
- Heizung: ${data.building.heating}
- Energieeffizienzklasse: ${data.building.energyClass}
- Keller/Fundament: ${data.building.foundation}

**BEWERTUNG:**
- Restnutzungsdauer: ${data.calculation.restnutzungsdauerYears} Jahre
- Gesamtnutzungsdauer: ${data.calculation.gesamtnutzungsdauerYears} Jahre
- Modernisierungsgrad: ${modernizationSummary.length > 0 ? modernizationSummary.join(', ') : 'Keine nennenswerten Modernisierungen'}

**AUSSTATTUNG:**
- Sanitär: ${data.components.sanitaryInstallation}
- Elektro: ${data.components.electricalInstallation}
- Heizungsart: ${data.components.heatingType}
- Besonderheiten: ${data.components.specialFeatures || 'keine'}
- Balkon vorhanden: ${hasBalcony ? 'Ja' : 'Nein'}

**BESICHTIGUNG:**
- Besichtigte Bereiche: ${data.inspection.areasVisited}
- Anwesend: ${data.inspection.attendees}

**VORHANDENE MODERNISIERUNGSLISTE:**
${data.narratives.modernizationList}

Generiere folgende Textbausteine als JSON. Der Stil muss EXAKT wie in professionellen Sachverständigengutachten sein - sachlich, formal, präzise:

{
  "useDescription": "Nutzungsbeschreibung, max 1 Satz, z.B. 'Wohnwirtschaftliche Nutzung des gesamten Gebäudes.'",
  "verticalAccess": "Erschließung, 1-2 Sätze, erwähne ob Aufzug vorhanden",
  "overallCondition": "AUSFÜHRLICHE Zustandsbeschreibung, 5-7 Sätze. Berücksichtige: Baujahr ${data.building.yearBuilt}, Alter ${age} Jahre, RND ${data.calculation.restnutzungsdauerYears} Jahre, Modernisierungen. Typischer Aufbau: 1) Gesamteinschätzung, 2) Energetische Bewertung, 3) Allgemeinbereiche, 4) Außenanlagen, 5) Schäden/Instandhaltung",
  "insulation": "Wärmedämmung, 1-2 Sätze, beziehe dich auf Baujahr und ob Dämmung modernisiert wurde",
  "barrierFree": "Barrierefreiheit, 1-2 Sätze, typischerweise 'nicht barrierefrei' bei Altbau ohne Aufzug",
  "floorPlanQuality": "Grundrissqualität, 1 Satz, z.B. 'zweckmäßig' oder 'zeitgemäß'",
  "barrierFreeShort": "Kurz: 'Nicht barrierefrei' oder 'Barrierefrei'",
  "lighting": "Belichtung, 1 Satz",
  "balcony": "Balkon-Info, 1 Satz, basierend auf: ${hasBalcony ? 'Balkon vorhanden' : 'Kein Balkon'}",
  "defects": "Mängel, 1-2 Sätze. Falls keine bekannt: Standardformulierung verwenden",
  "otherNotes": "Abschluss, 2-3 Sätze. MUSS enthalten: Hinweis dass Liste nicht vollständig und Gutachten kein Bauschadensgutachten ersetzt"
}

WICHTIG: Verwende den typischen Gutachten-Stil. Vermeide Marketing-Sprache. Beziehe konkrete Zahlen ein (Baujahr, Alter, RND).
`;
}

function generateMockNarratives(data: GutachtenData): GutachtenData['narratives'] {
  const yearBuilt = data.building.yearBuilt;
  const age = new Date().getFullYear() - yearBuilt;
  const rnd = data.calculation.restnutzungsdauerYears;

  // === USE DESCRIPTION (deterministic from nutzungsart) ===
  const useDescriptionMap: Record<string, string> = {
    wohnwirtschaftlich: 'Wohnwirtschaftliche Nutzung des gesamten Gebäudes.',
    gewerblich: 'Gewerbliche Nutzung des gesamten Gebäudes.',
    gemischt: 'Gemischt genutzte Immobilie mit wohnwirtschaftlichen und gewerblichen Einheiten.',
  };
  const useDescription = useDescriptionMap[data.building.nutzungsart ?? 'wohnwirtschaftlich'];

  // === VERTICAL ACCESS (deterministic from aufzug) ===
  const verticalAccess = data.building.aufzug
    ? 'Die vertikale Erschließung aller Etagen des Gebäudes erfolgt über das Treppenhaus sowie einen Aufzug.'
    : 'Die vertikale Erschließung aller Etagen des Gebäudes erfolgt über das Treppenhaus. Ein Aufzug ist nicht vorhanden.';

  // === OVERALL CONDITION (uses RND vs expected calculation) ===
  const expectedRND = data.calculation.gesamtnutzungsdauerYears - age;
  const conditionRating = rnd >= expectedRND ? 'dem Alter entsprechend' :
    rnd >= expectedRND - 10 ? 'als nicht mehr zeitgemäß' : 'als sanierungsbedürftig';
  const overallCondition = `Insgesamt kann festgestellt werden, dass der Zustand des Wertermittlungsobjektes auch unter Berücksichtigung der durchgeführten Modernisierungsmaßnahmen ${conditionRating} zu beurteilen ist. Das Gebäude wurde ${yearBuilt} errichtet und weist ein Alter von ${age} Jahren auf. Die wirtschaftliche Restnutzungsdauer beträgt ${rnd} Jahre. Eine energetische Sanierung ist in Betracht zu ziehen. Die Allgemeinbereiche und die Erschließung des Objektes sind in mittlerem Zustand. Wesentliche Schäden an den baulichen Anlagen sind aus der Ortsbesichtigung nicht ersichtlich.`;

  // === INSULATION (from modernization points) ===
  const hasInsulation = data.modernization.wallInsulation.points > 0;
  const insulationText = hasInsulation
    ? `Die Wärmedämmung wurde modernisiert und entspricht verbesserten Standards. Die energetischen Eigenschaften des Gebäudes sind dadurch gegenüber dem ursprünglichen Baujahr ${yearBuilt} verbessert.`
    : `Die Wärmedämmung entspricht nicht den modernen Anforderungen. Die Energiekosten sind aufgrund der dem Baujahr ${yearBuilt} entsprechenden Wärmedämmung verhältnismäßig hoch.`;

  // === BARRIER FREE (deterministic from accessibility + aufzug) ===
  const barrierFree = data.accessibility?.barrierefrei
    ? 'Das Objekt ist barrierefrei erreichbar.'
    : data.building.aufzug
      ? 'Das Gebäude verfügt über einen Aufzug. Die Wohneinheit ist über diesen erreichbar, jedoch nicht vollständig barrierefrei gestaltet.'
      : 'Das Haus ist nicht barrierefrei. Um eine Barrierefreiheit herzustellen, müssten größere Umbaumaßnahmen durchgeführt werden.';
  const barrierFreeShort = data.accessibility?.barrierefrei ? 'Barrierefrei' : 'Nicht barrierefrei';

  // === FLOOR PLAN QUALITY (from modernization points) ===
  const floorPlanPoints = data.modernization.floorPlanImprovement.points;
  const floorPlanQuality = floorPlanPoints >= 3
    ? 'Die Qualität des Grundrisses ist als zeitgemäß und hochwertig zu bezeichnen.'
    : floorPlanPoints > 0
      ? 'Die Qualität des Grundrisses ist als zeitgemäß zu bezeichnen.'
      : 'Die Qualität des Grundrisses ist als zweckmäßig zu bezeichnen.';

  // === LIGHTING (deterministic from accessibility.belichtung) ===
  const lightingMap: Record<string, string> = {
    einwandfrei: 'Die Belichtungsverhältnisse sind einwandfrei.',
    eingeschraenkt: 'Die Belichtungsverhältnisse sind aufgrund der Lage eingeschränkt.',
    mangelhaft: 'Die Belichtungsverhältnisse sind mangelhaft.',
  };
  const lighting = lightingMap[data.accessibility?.belichtung || 'einwandfrei'];

  // === BALCONY/OUTDOOR (deterministic from outdoor section) ===
  let balcony: string;
  if (data.outdoor?.hatBalkon) {
    balcony = data.outdoor.flaeche > 0
      ? `Das Sondereigentum verfügt über einen Balkon mit ca. ${data.outdoor.flaeche} m².`
      : 'Das Sondereigentum verfügt über einen Balkon.';
  } else if (data.outdoor?.hatTerrasse) {
    balcony = data.outdoor.flaeche > 0
      ? `Das Sondereigentum verfügt über eine Terrasse mit ca. ${data.outdoor.flaeche} m².`
      : 'Das Sondereigentum verfügt über eine Terrasse.';
  } else if (data.outdoor?.hatGarten) {
    balcony = 'Das Sondereigentum verfügt über einen Gartenanteil.';
  } else {
    balcony = 'Das Sondereigentum verfügt über keinen Balkon oder Außenbereich.';
  }

  return {
    useDescription,
    verticalAccess,
    overallCondition,
    insulation: insulationText,
    barrierFree,
    modernizationList: data.narratives.modernizationList, // Keep existing from merger
    floorPlanQuality,
    barrierFreeShort,
    lighting,
    balcony,
    defects:
      'Wesentliche Bauschäden konnten während der Besichtigung nicht festgestellt werden.',
    otherNotes:
      'Weitere bautechnische Beanstandungen konnten während des Ortstermins nicht festgestellt werden. Die Aufstellung der bautechnischen Beanstandungen erhebt nicht den Anspruch auf Vollständigkeit, da das vorliegende Gutachten kein qualifiziertes Bauschadensgutachten ersetzen soll und kann.',
  };
}
