'use client';

import { useState, useEffect } from 'react';
import { useEditorStore } from '../lib/store';
import type { GutachtenData } from '../lib/schema';
import { FORM_SECTIONS } from '../lib/schema';
import { PropertySection } from './sections/PropertySection';
import { DatesSection } from './sections/DatesSection';
import { ClientSection } from './sections/ClientSection';
import { BuildingSection } from './sections/BuildingSection';
import { CalculationSection } from './sections/CalculationSection';
import { InspectionSection } from './sections/InspectionSection';
import { NarrativesSection } from './sections/NarrativesSection';
import { ComponentsSection } from './sections/ComponentsSection';
import { DocumentPreview } from './DocumentPreview';

interface CaseSummary {
  id: string;
  client: string;
  street: string;
  city: string;
  yearBuilt: number;
  label: string;
}

const SECTION_COMPONENTS: Record<string, React.ComponentType> = {
  property: PropertySection,
  dates: DatesSection,
  client: ClientSection,
  building: BuildingSection,
  calculation: CalculationSection,
  inspection: InspectionSection,
  narratives: NarrativesSection,
  components: ComponentsSection,
};

export function GutachtenForm() {
  const [showPreview, setShowPreview] = useState(true);
  const [isLoadingCase, setIsLoadingCase] = useState(false);
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [isLoadingCases, setIsLoadingCases] = useState(true);

  const activeSection = useEditorStore((s) => s.activeSection);
  const setActiveSection = useEditorStore((s) => s.setActiveSection);
  const isExporting = useEditorStore((s) => s.isExporting);
  const setIsExporting = useEditorStore((s) => s.setIsExporting);
  const isGeneratingNarrative = useEditorStore((s) => s.isGeneratingNarrative);
  const setIsGeneratingNarrative = useEditorStore(
    (s) => s.setIsGeneratingNarrative
  );
  const resetToDefaults = useEditorStore((s) => s.resetToDefaults);
  const loadCase = useEditorStore((s) => s.loadCase);
  const isDirty = useEditorStore((s) => s.isDirty);
  const data = useEditorStore((s) => s.data);

  const ActiveSectionComponent = SECTION_COMPONENTS[activeSection];

  // Load cases list on mount
  useEffect(() => {
    async function fetchCases() {
      try {
        const response = await fetch('/api/cases');
        if (response.ok) {
          const result = await response.json();
          setCases(result.cases);
        }
      } catch (error) {
        console.error('Failed to load cases:', error);
      } finally {
        setIsLoadingCases(false);
      }
    }
    fetchCases();
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/export-gutachten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `gutachten-rnd-${data.property.city.toLowerCase().replace(/[^a-z0-9]/g, '-')}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Export-Fehler: ' + String(error));
    } finally {
      setIsExporting(false);
    }
  };

  const handleGenerateNarratives = async () => {
    setIsGeneratingNarrative(true);
    try {
      const response = await fetch('/api/generate-narratives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        throw new Error('Narrative generation failed');
      }

      const result = await response.json();
      useEditorStore.getState().setData({ narratives: result.narratives });

      alert(
        result.mock
          ? 'Mock-Daten geladen (kein API-Key)'
          : 'Narrative erfolgreich generiert'
      );
    } catch (error) {
      console.error('Narrative generation error:', error);
      alert('Fehler: ' + String(error));
    } finally {
      setIsGeneratingNarrative(false);
    }
  };

  const handleReset = () => {
    if (confirm('Alle Änderungen zurücksetzen?')) {
      resetToDefaults();
      setSelectedCaseId('');
    }
  };

  const handleLoadCase = async (caseId: string) => {
    if (!caseId) return;

    setIsLoadingCase(true);
    setSelectedCaseId(caseId);
    try {
      const response = await fetch(`/api/cases/${caseId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load case');
      }
      const caseData: GutachtenData = await response.json();
      loadCase(caseData);

      const selectedCase = cases.find((c) => c.id === caseId);
      if (selectedCase) {
        alert(`Fall geladen: ${selectedCase.street}, ${selectedCase.city}`);
      }
    } catch (error) {
      console.error('Load case error:', error);
      alert('Fehler beim Laden: ' + String(error));
      setSelectedCaseId('');
    } finally {
      setIsLoadingCase(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-200">
          <h1 className="font-bold text-lg text-gray-900">RND Gutachten</h1>
          <p className="text-xs text-gray-500 mt-1">Maria Knoop Editor</p>
        </div>

        {/* Case Selector */}
        <div className="p-3 border-b border-gray-200">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Fall auswählen
          </label>
          <select
            value={selectedCaseId}
            onChange={(e) => handleLoadCase(e.target.value)}
            disabled={isLoadingCase || isLoadingCases}
            className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:bg-gray-100"
          >
            <option value="">
              {isLoadingCases
                ? 'Lade Fälle...'
                : `-- ${cases.length} Fälle verfügbar --`}
            </option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.street}, {c.city} ({c.yearBuilt})
              </option>
            ))}
          </select>
          {isLoadingCase && (
            <p className="text-xs text-orange-600 mt-1">Lade Fall...</p>
          )}
        </div>

        {/* Section Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          {FORM_SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full text-left px-3 py-2 rounded-md mb-1 transition-colors ${
                activeSection === section.id
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="text-sm">{section.label}</div>
              <div className="text-xs text-gray-400">{section.description}</div>
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div className="p-3 border-t border-gray-200 space-y-2">
          <button
            onClick={handleGenerateNarratives}
            disabled={isGeneratingNarrative}
            className="w-full px-3 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            {isGeneratingNarrative ? 'Generiere...' : 'Narrative generieren'}
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isExporting ? 'Exportiere...' : 'DOCX exportieren'}
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`w-full px-3 py-2 text-sm rounded-md ${
              showPreview
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {showPreview ? 'Vorschau an' : 'Vorschau aus'}
          </button>
          {isDirty && (
            <button
              onClick={handleReset}
              className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Zurücksetzen
            </button>
          )}
        </div>
      </div>

      {/* Main Content - Form */}
      <div
        className={`overflow-y-auto ${showPreview ? 'w-1/2' : 'flex-1'}`}
      >
        <div className="max-w-2xl mx-auto p-6">
          {ActiveSectionComponent && <ActiveSectionComponent />}
        </div>
      </div>

      {/* Preview Panel */}
      {showPreview && (
        <div className="w-1/2 border-l border-gray-200">
          <DocumentPreview />
        </div>
      )}
    </div>
  );
}
