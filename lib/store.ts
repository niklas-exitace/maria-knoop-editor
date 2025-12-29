/**
 * Editor state management with Zustand.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GutachtenData } from './schema';
import { DEFAULT_GUTACHTEN_DATA } from './schema';

interface EditorStore {
  // Data
  data: GutachtenData;
  isDirty: boolean;

  // UI State
  activeSection: string;
  isExporting: boolean;
  isGeneratingNarrative: boolean;

  // Actions
  setData: (data: Partial<GutachtenData>) => void;
  loadCase: (data: GutachtenData) => void;
  updateField: <K extends keyof GutachtenData>(
    section: K,
    field: keyof GutachtenData[K],
    value: GutachtenData[K][keyof GutachtenData[K]]
  ) => void;
  setActiveSection: (section: string) => void;
  setIsExporting: (exporting: boolean) => void;
  setIsGeneratingNarrative: (generating: boolean) => void;
  resetToDefaults: () => void;
}

export const useEditorStore = create<EditorStore>()(
  persist(
    (set) => ({
      // Initial state
      data: DEFAULT_GUTACHTEN_DATA,
      isDirty: false,
      activeSection: 'property',
      isExporting: false,
      isGeneratingNarrative: false,

      // Actions
      setData: (newData) => {
        set((state) => ({
          data: { ...state.data, ...newData },
          isDirty: true,
        }));
      },

      loadCase: (caseData) => {
        set({
          data: caseData,
          isDirty: true,
        });
      },

      updateField: (section, field, value) => {
        set((state) => ({
          data: {
            ...state.data,
            [section]: {
              ...state.data[section],
              [field]: value,
            },
          },
          isDirty: true,
        }));
      },

      setActiveSection: (section) => set({ activeSection: section }),
      setIsExporting: (exporting) => set({ isExporting: exporting }),
      setIsGeneratingNarrative: (generating) =>
        set({ isGeneratingNarrative: generating }),

      resetToDefaults: () =>
        set({
          data: DEFAULT_GUTACHTEN_DATA,
          isDirty: false,
        }),
    }),
    {
      name: 'maria-knoop-editor-v2',
      partialize: (state) => ({
        data: state.data,
        activeSection: state.activeSection,
      }),
    }
  )
);
