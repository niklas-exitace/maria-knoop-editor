'use client';

import { useEditorStore } from '../../lib/store';
import { FormField, SectionHeader, FieldGroup } from './FormField';

export function PropertySection() {
  const data = useEditorStore((s) => s.data.property);
  const updateField = useEditorStore((s) => s.updateField);

  const update = (field: keyof typeof data, value: string) => {
    updateField('property', field, value);
  };

  return (
    <div>
      <SectionHeader
        title="Objektdaten"
        description="Grundinformationen zur bewerteten Immobilie"
      />

      <FieldGroup title="Wohneinheit">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Wohnungstyp"
            value={data.unitType}
            onChange={(v) => update('unitType', v)}
            placeholder="z.B. 3-Zimmer-Wohnung"
          />
          <FormField
            label="Lage im Gebäude"
            value={data.unitPosition}
            onChange={(v) => update('unitPosition', v)}
            placeholder="z.B. 3. OG rechts"
          />
        </div>
      </FieldGroup>

      <FieldGroup title="Adresse">
        <FormField
          label="Straße und Hausnummer"
          value={data.street}
          onChange={(v) => update('street', v)}
          placeholder="z.B. Daimlerstraße 4c"
        />
        <div className="grid grid-cols-3 gap-4">
          <FormField
            label="PLZ"
            value={data.zipCode}
            onChange={(v) => update('zipCode', v)}
            placeholder="21337"
          />
          <div className="col-span-2">
            <FormField
              label="Stadt"
              value={data.city}
              onChange={(v) => update('city', v)}
              placeholder="Lüneburg"
            />
          </div>
        </div>
      </FieldGroup>
    </div>
  );
}
