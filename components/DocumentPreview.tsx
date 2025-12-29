'use client';

import { useEffect, useState, useRef } from 'react';
import { useEditorStore } from '../lib/store';

export function DocumentPreview() {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const data = useEditorStore((s) => s.data);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Use a stable key to detect data changes
  const dataKey = JSON.stringify(data);

  const fetchPreview = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/preview-gutachten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Preview failed');
      }

      const result = await response.json();
      setHtml(result.html);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  // Debounced preview update - triggers on dataKey change
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchPreview();
    }, 500); // 500ms debounce

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [dataKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* Header */}
      <div className="px-4 py-2 bg-white border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Vorschau</h3>
        <div className="flex items-center gap-2">
          {loading && (
            <span className="text-xs text-gray-500">Aktualisiere...</span>
          )}
          <button
            onClick={fetchPreview}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
          >
            ↻ Neu laden
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-auto p-4">
        {error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            Fehler: {error}
          </div>
        ) : html ? (
          <div
            className="gutachten-preview bg-white shadow-lg mx-auto max-w-[210mm] p-8 min-h-[297mm]"
            style={{
              fontFamily: 'Times New Roman, serif',
              fontSize: '11pt',
              lineHeight: '1.5',
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            {loading ? 'Lade Vorschau...' : 'Keine Vorschau verfügbar'}
          </div>
        )}
      </div>

      {/* Preview Styles */}
      <style jsx global>{`
        .gutachten-preview h1 {
          font-size: 16pt;
          font-weight: bold;
          margin-bottom: 12pt;
        }
        .gutachten-preview h2 {
          font-size: 14pt;
          font-weight: bold;
          margin-top: 12pt;
          margin-bottom: 8pt;
        }
        .gutachten-preview h3 {
          font-size: 12pt;
          font-weight: bold;
          margin-top: 10pt;
          margin-bottom: 6pt;
        }
        .gutachten-preview p {
          margin-bottom: 6pt;
        }
        .gutachten-preview table {
          width: 100%;
          border-collapse: collapse;
          margin: 8pt 0;
        }
        .gutachten-preview td,
        .gutachten-preview th {
          border: 1px solid #ccc;
          padding: 4pt 6pt;
          text-align: left;
        }
        .gutachten-preview img {
          max-width: 100%;
          height: auto;
        }
      `}</style>
    </div>
  );
}
