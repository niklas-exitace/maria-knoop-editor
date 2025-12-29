'use client';

import { useEditorStore } from '../../lib/store';
import { FormField, SectionHeader, FieldGroup } from './FormField';

export function DatesSection() {
  const data = useEditorStore((s) => s.data.dates);
  const updateField = useEditorStore((s) => s.updateField);

  const update = (field: keyof typeof data, value: string) => {
    updateField('dates', field, value);
  };

  return (
    <div>
      <SectionHeader
        title="Termine"
        description="Relevante Stichtage für das Gutachten"
      />

      <FieldGroup>
        <FormField
          label="Wertermittlungsstichtag"
          value={data.valuationDate}
          onChange={(v) => update('valuationDate', v)}
          placeholder="TT.MM.JJJJ"
          hint="Datum, auf das sich die Wertermittlung bezieht"
        />
        <FormField
          label="Besichtigungsdatum"
          value={data.inspectionDate}
          onChange={(v) => update('inspectionDate', v)}
          placeholder="TT.MM.JJJJ"
          hint="Datum der Ortsbesichtigung"
        />
        <FormField
          label="Gutachtendatum"
          value={data.reportDate}
          onChange={(v) => update('reportDate', v)}
          placeholder="TT.MM.JJJJ"
          hint="Ausstellungsdatum des Gutachtens"
        />
      </FieldGroup>
    </div>
  );
}
