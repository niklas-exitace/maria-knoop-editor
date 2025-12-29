'use client';

import { useEditorStore } from '../../lib/store';
import { FormField, SectionHeader, FieldGroup } from './FormField';

export function CalculationSection() {
  const data = useEditorStore((s) => s.data.calculation);
  const areas = useEditorStore((s) => s.data.areas);
  const updateField = useEditorStore((s) => s.updateField);

  const updateCalc = (field: keyof typeof data, value: string | number) => {
    updateField('calculation', field, value as string);
  };

  const updateAreas = (field: keyof typeof areas, value: number) => {
    updateField('areas', field, value);
  };

  return (
    <div>
      <SectionHeader
        title="Berechnung"
        description="Restnutzungsdauer-Ermittlung"
      />

      <FieldGroup title="Nutzungsdauer">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Restnutzungsdauer (Jahre)"
            value={data.restnutzungsdauerYears}
            onChange={(v) =>
              updateCalc('restnutzungsdauerYears', parseInt(v) || 0)
            }
            type="number"
            hint="Ermittelte RND gem. ImmoWertV"
          />
          <FormField
            label="Gesamtnutzungsdauer (Jahre)"
            value={data.gesamtnutzungsdauerYears}
            onChange={(v) =>
              updateCalc('gesamtnutzungsdauerYears', parseInt(v) || 0)
            }
            type="number"
            hint="Wirtschaftliche Gesamtnutzungsdauer"
          />
        </div>
        <FormField
          label="Standardstufe"
          value={data.standardStufe}
          onChange={(v) => updateCalc('standardStufe', v)}
          placeholder="z.B. ImmoWertV – Stufe 2 bis 3"
        />
        <FormField
          label="Brutto-Grundfläche"
          value={data.grossFloorArea}
          onChange={(v) => updateCalc('grossFloorArea', v)}
          placeholder="z.B. 850 m² oder k. A."
        />
      </FieldGroup>

      <FieldGroup title="Wohnfläche">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Wohnfläche (m²)"
            value={areas.livingAreaM2}
            onChange={(v) => updateAreas('livingAreaM2', parseFloat(v) || 0)}
            type="number"
          />
          <FormField
            label="Balkonfläche (m²)"
            value={areas.balconyAreaM2}
            onChange={(v) => updateAreas('balconyAreaM2', parseFloat(v) || 0)}
            type="number"
          />
        </div>
      </FieldGroup>
    </div>
  );
}
