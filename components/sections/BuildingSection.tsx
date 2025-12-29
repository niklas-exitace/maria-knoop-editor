'use client';

import { useEditorStore } from '../../lib/store';
import { FormField, SectionHeader, FieldGroup } from './FormField';

export function BuildingSection() {
  const data = useEditorStore((s) => s.data.building);
  const updateField = useEditorStore((s) => s.updateField);

  const update = (field: keyof typeof data, value: string | number) => {
    updateField('building', field, value as string);
  };

  return (
    <div>
      <SectionHeader
        title="Gebäudedaten"
        description="Bauliche Eigenschaften des Gebäudes"
      />

      <FieldGroup title="Grunddaten">
        <FormField
          label="Gebäudetyp"
          value={data.type}
          onChange={(v) => update('type', v)}
          placeholder="z.B. Mehrfamilienhaus mit 28 Wohnungen"
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Baujahr"
            value={data.yearBuilt}
            onChange={(v) => update('yearBuilt', parseInt(v) || 0)}
            type="number"
          />
          <FormField
            label="Energieeffizienzklasse"
            value={data.energyClass}
            onChange={(v) => update('energyClass', v)}
            placeholder="z.B. D"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Geschosse"
            value={data.floors}
            onChange={(v) => update('floors', v)}
            placeholder="z.B. UG - 3. OG"
          />
          <FormField
            label="Dachgeschoss"
            value={data.atticInfo}
            onChange={(v) => update('atticInfo', v)}
            placeholder="z.B. DG nicht ausgebaut"
          />
        </div>
      </FieldGroup>

      <FieldGroup title="Konstruktion">
        <FormField
          label="Gründung"
          value={data.foundation}
          onChange={(v) => update('foundation', v)}
          placeholder="z.B. Untergeschoss, Stampfbeton"
        />
        <FormField
          label="Außenwände"
          value={data.exteriorWalls}
          onChange={(v) => update('exteriorWalls', v)}
          placeholder="z.B. Mauerwerk, verputzt"
        />
        <FormField
          label="Dach"
          value={data.roof}
          onChange={(v) => update('roof', v)}
          placeholder="z.B. Flachdach mit Bitumenabdichtung"
        />
        <FormField
          label="Fenster"
          value={data.windows}
          onChange={(v) => update('windows', v)}
          placeholder="z.B. Kunststofffenster, Isolierverglasung"
        />
      </FieldGroup>

      <FieldGroup title="Haustechnik">
        <FormField
          label="Heizung"
          value={data.heating}
          onChange={(v) => update('heating', v)}
          placeholder="z.B. Zentralheizung (Gas)"
        />
      </FieldGroup>
    </div>
  );
}
