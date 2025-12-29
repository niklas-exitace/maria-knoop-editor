'use client';

import { useEditorStore } from '../../lib/store';
import { FormField, SectionHeader, FieldGroup } from './FormField';

export function NarrativesSection() {
  const data = useEditorStore((s) => s.data.narratives);
  const updateField = useEditorStore((s) => s.updateField);
  const isGenerating = useEditorStore((s) => s.isGeneratingNarrative);

  const update = (field: keyof typeof data, value: string) => {
    updateField('narratives', field, value);
  };

  return (
    <div>
      <SectionHeader
        title="Beschreibungen"
        description="Freitextfelder - können per KI generiert werden"
      />

      {isGenerating && (
        <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-md">
          <p className="text-sm text-purple-700">Narrative werden generiert...</p>
        </div>
      )}

      <FieldGroup title="Nutzung & Erschließung">
        <FormField
          label="Nutzungsbeschreibung"
          value={data.useDescription}
          onChange={(v) => update('useDescription', v)}
          type="textarea"
          rows={2}
        />
        <FormField
          label="Vertikale Erschließung"
          value={data.verticalAccess}
          onChange={(v) => update('verticalAccess', v)}
          type="textarea"
          rows={2}
          hint="Treppenhaus, Aufzug etc."
        />
      </FieldGroup>

      <FieldGroup title="Zustand">
        <FormField
          label="Gesamtzustand"
          value={data.overallCondition}
          onChange={(v) => update('overallCondition', v)}
          type="textarea"
          rows={6}
          hint="Ausführliche Zustandsbeschreibung"
        />
        <FormField
          label="Wärmedämmung"
          value={data.insulation}
          onChange={(v) => update('insulation', v)}
          type="textarea"
          rows={2}
        />
        <FormField
          label="Barrierefreiheit"
          value={data.barrierFree}
          onChange={(v) => update('barrierFree', v)}
          type="textarea"
          rows={2}
        />
        <FormField
          label="Barrierefreiheit (kurz)"
          value={data.barrierFreeShort}
          onChange={(v) => update('barrierFreeShort', v)}
        />
      </FieldGroup>

      <FieldGroup title="Modernisierungen">
        <FormField
          label="Modernisierungsliste"
          value={data.modernizationList}
          onChange={(v) => update('modernizationList', v)}
          type="textarea"
          rows={8}
          hint="Auflistung der durchgeführten Modernisierungen"
        />
      </FieldGroup>

      <FieldGroup title="Weitere Eigenschaften">
        <FormField
          label="Grundrissqualität"
          value={data.floorPlanQuality}
          onChange={(v) => update('floorPlanQuality', v)}
          type="textarea"
          rows={2}
        />
        <FormField
          label="Belichtung"
          value={data.lighting}
          onChange={(v) => update('lighting', v)}
        />
        <FormField
          label="Balkon"
          value={data.balcony}
          onChange={(v) => update('balcony', v)}
        />
      </FieldGroup>

      <FieldGroup title="Mängel & Anmerkungen">
        <FormField
          label="Bauschäden / Mängel"
          value={data.defects}
          onChange={(v) => update('defects', v)}
          type="textarea"
          rows={3}
        />
        <FormField
          label="Sonstige Anmerkungen"
          value={data.otherNotes}
          onChange={(v) => update('otherNotes', v)}
          type="textarea"
          rows={4}
        />
      </FieldGroup>
    </div>
  );
}
