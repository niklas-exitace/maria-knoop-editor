'use client';

import { useEditorStore } from '../../lib/store';
import { FormField, SectionHeader, FieldGroup } from './FormField';

export function ClientSection() {
  const data = useEditorStore((s) => s.data.client);
  const updateField = useEditorStore((s) => s.updateField);

  const update = (field: keyof typeof data, value: string) => {
    updateField('client', field, value);
  };

  return (
    <div>
      <SectionHeader
        title="Auftraggeber"
        description="Informationen zum Auftraggeber des Gutachtens"
      />

      <FieldGroup>
        <FormField
          label="Name des Auftraggebers"
          value={data.name}
          onChange={(v) => update('name', v)}
          placeholder="z.B. Max Mustermann"
        />
      </FieldGroup>
    </div>
  );
}
