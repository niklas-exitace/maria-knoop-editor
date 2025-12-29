'use client';

import { useEditorStore } from '../../lib/store';
import { FormField, SectionHeader, FieldGroup } from './FormField';

export function ComponentsSection() {
  const data = useEditorStore((s) => s.data.components);
  const updateField = useEditorStore((s) => s.updateField);

  const update = (field: keyof typeof data, value: string) => {
    updateField('components', field, value);
  };

  return (
    <div>
      <SectionHeader
        title="Ausstattung"
        description="Gebäudemerkmale und Ausstattungsstandard"
      />

      <FieldGroup>
        <FormField
          label="Sanitäre Anlagen"
          value={data.sanitaryInstallation}
          onChange={(v) => update('sanitaryInstallation', v)}
          placeholder="z.B. Durchschnittliche Ausstattung"
        />
        <FormField
          label="Elektroinstallation"
          value={data.electricalInstallation}
          onChange={(v) => update('electricalInstallation', v)}
          placeholder="z.B. Durchschnittliche Ausstattung"
        />
        <FormField
          label="Heizungsart"
          value={data.heatingType}
          onChange={(v) => update('heatingType', v)}
          placeholder="z.B. Heizkörper"
        />
        <FormField
          label="Besondere Bauteile"
          value={data.specialFeatures}
          onChange={(v) => update('specialFeatures', v)}
          placeholder="z.B. Balkon"
        />
      </FieldGroup>
    </div>
  );
}
