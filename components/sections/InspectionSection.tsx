'use client';

import { useEditorStore } from '../../lib/store';
import { FormField, SectionHeader, FieldGroup } from './FormField';

export function InspectionSection() {
  const data = useEditorStore((s) => s.data.inspection);
  const updateField = useEditorStore((s) => s.updateField);

  const update = (field: keyof typeof data, value: string) => {
    updateField('inspection', field, value);
  };

  return (
    <div>
      <SectionHeader
        title="Besichtigung"
        description="Details zum Ortstermin"
      />

      <FieldGroup>
        <FormField
          label="Anwesende Personen"
          value={data.attendees}
          onChange={(v) => update('attendees', v)}
          placeholder="z.B. Der Mieter / Name anonymisiert"
          hint="Wer war bei der Besichtigung anwesend?"
        />
        <FormField
          label="Besichtigte Bereiche"
          value={data.areasVisited}
          onChange={(v) => update('areasVisited', v)}
          type="textarea"
          rows={2}
          placeholder="z.B. Treppenaufgang, 2 Wohn-/Schlafräume sowie Küche und Badezimmer"
          hint="Welche Räume/Bereiche wurden besichtigt?"
        />
      </FieldGroup>
    </div>
  );
}
