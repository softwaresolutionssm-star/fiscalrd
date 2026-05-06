'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Upload, X, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

interface CsvImportModalProps {
  title: string;
  endpoint: string;          // e.g. '/products/import/csv'
  templateHeaders: string;   // e.g. 'Nombre,Precio,ITBIS%,...'
  templateExample: string;   // e.g. 'Aceite Vegetal,150,18,...'
  onSuccess: () => void;
  onClose: () => void;
}

export function CsvImportModal({ title, endpoint, templateHeaders, templateExample, onSuccess, onClose }: CsvImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.name.match(/\.(csv|txt)$/i)) { toast.error('Solo se aceptan archivos CSV'); return; }
    setFile(f); setResult(null);
  };

  const downloadTemplate = () => {
    const content = '\uFEFF' + templateHeaders + '\r\n' + templateExample;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `plantilla-${endpoint.split('/')[1]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const r = await api.post(endpoint, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const data = r.data?.data ?? r.data;
      setResult(data);
      if (data.created > 0) { toast.success(`${data.created} registros importados`); onSuccess(); }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al importar');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Importar {title} desde CSV</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400 hover:text-slate-600" /></button>
        </div>

        <div className="mb-4 bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
          <p className="font-medium mb-1">Formato requerido:</p>
          <code className="text-blue-800 font-mono">{templateHeaders}</code>
          <button onClick={downloadTemplate} className="ml-2 underline hover:no-underline">Descargar plantilla</button>
        </div>

        {!result ? (
          <>
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-8 text-center cursor-pointer transition-colors"
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-slate-700">
                  <FileText size={20} className="text-blue-500" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-slate-400 text-xs">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              ) : (
                <div className="text-slate-400">
                  <Upload size={28} className="mx-auto mb-2" />
                  <p className="text-sm">Arrastra tu archivo CSV aquí o haz clic para seleccionarlo</p>
                </div>
              )}
            </div>
            <input ref={inputRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleImport}
                disabled={!file || loading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Importando...' : 'Importar'}
              </button>
              <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg p-3">
              <CheckCircle size={16} />
              <span className="text-sm font-medium">{result.created} registros importados exitosamente</span>
            </div>
            {result.errors.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 max-h-40 overflow-auto">
                <div className="flex items-center gap-1 text-red-700 text-xs font-medium mb-2">
                  <AlertCircle size={13} /> {result.errors.length} error(es):
                </div>
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-600">{e}</p>
                ))}
              </div>
            )}
            <button onClick={onClose} className="w-full bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700">
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
