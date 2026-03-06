import React, { useState } from 'react';
import { SimulationHistoryEntry, CreditType } from '../types';
import { getHistory, clearHistory, deleteHistoryEntry, renameHistoryEntry } from '../services/historyService';

interface HistoryModalProps {
  onClose: () => void;
  onLoadSimulation: (entry: SimulationHistoryEntry) => void;
  onCompareSelected: (entries: SimulationHistoryEntry[]) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-ES', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

const CREDIT_TYPE_COLORS: Record<CreditType, string> = {
  hipotecario: '#00B9AE',
  vehicular: '#3B82F6',
  microcredito: '#F59E0B',
  consumo: '#22C55E',
  capacidad: '#EC4899',
};

export const HistoryModal = ({ onClose, onLoadSimulation, onCompareSelected }: HistoryModalProps) => {
  const [history, setHistory] = useState<SimulationHistoryEntry[]>(getHistory);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleClear = () => {
    clearHistory();
    setHistory([]);
    setSelected(new Set());
  };

  const handleDelete = (id: string) => {
    const updated = deleteHistoryEntry(id);
    setHistory(updated);
    setSelected((prev) => { const s = new Set(prev); s.delete(id); return s; });
    setConfirmDeleteId(null);
  };

  const handleStartEdit = (entry: SimulationHistoryEntry) => {
    setEditingId(entry.id);
    setEditingName(entry.creditTitle);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editingName.trim()) return;
    const updated = renameHistoryEntry(editingId, editingName.trim());
    setHistory(updated);
    setEditingId(null);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) {
        s.delete(id);
      } else if (s.size < 3) {
        s.add(id);
      }
      return s;
    });
  };

  const handleCompare = () => {
    const entries = history.filter((e) => selected.has(e.id));
    onCompareSelected(entries);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-md bg-gradient-to-b from-slate-800 to-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-700/60 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        <div className="relative px-6 pt-6 pb-4 border-b border-slate-700/60 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-700/60 text-gray-400 hover:text-white hover:bg-slate-600 transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(0,185,174,0.15)', border: '1.5px solid rgba(0,185,174,0.3)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#00B9AE" strokeWidth={1.8} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Historial de Simulaciones</h2>
              <p className="text-xs text-gray-400">
                {history.length === 0
                  ? 'Sin simulaciones'
                  : selected.size > 0
                  ? `${selected.size} de 3 seleccionadas`
                  : `${history.length} simulaciones · selecciona hasta 3 para comparar`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-700/40 flex items-center justify-center mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-gray-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-400 font-medium">Sin historial todavia</p>
              <p className="text-gray-500 text-sm mt-1">Las simulaciones que calcules apareceran aqui</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => {
                const color = CREDIT_TYPE_COLORS[entry.creditType] ?? '#00B9AE';
                const isSelected = selected.has(entry.id);
                const isEditing = editingId === entry.id;
                const isConfirmDelete = confirmDeleteId === entry.id;
                const canSelect = isSelected || selected.size < 3;

                return (
                  <div
                    key={entry.id}
                    className={`relative rounded-xl border transition-all duration-200 ${
                      isSelected
                        ? 'border-opacity-80 bg-slate-700/50'
                        : 'border-slate-600/40 bg-slate-700/30'
                    }`}
                    style={isSelected ? { borderColor: color } : undefined}
                  >
                    {isConfirmDelete ? (
                      <div className="p-4 flex flex-col gap-3">
                        <p className="text-sm text-white font-medium">Eliminar esta simulacion?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="flex-1 py-2 text-sm font-semibold bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-all"
                          >
                            Eliminar
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="flex-1 py-2 text-sm font-semibold bg-slate-700/60 hover:bg-slate-600/60 text-gray-300 border border-slate-600/40 rounded-lg transition-all"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => canSelect && toggleSelect(entry.id)}
                          className={`w-full text-left p-4 transition-all duration-200 ${canSelect ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border-2 transition-all ${
                                  isSelected ? 'border-current' : 'border-slate-500'
                                }`}
                                style={isSelected ? { backgroundColor: color, borderColor: color } : undefined}
                              >
                                {isSelected && (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} className="w-3 h-3">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                                style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}80` }}
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{entry.creditTitle}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  ${formatCurrency(entry.montoPrestamo)} · {entry.plazoAnios} años · {entry.tasaInteresAnual}%
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-bold" style={{ color }}>${formatCurrency(entry.cuotaMensual)}/mes</p>
                              <p className="text-xs text-gray-500 mt-0.5">{entry.date}</p>
                            </div>
                          </div>
                        </button>

                        {isEditing ? (
                          <div className="px-4 pb-3 flex gap-2">
                            <input
                              autoFocus
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                              className="flex-1 px-3 py-1.5 text-sm bg-slate-700/80 border border-slate-500 rounded-lg text-white focus:outline-none focus:border-turquoise"
                            />
                            <button
                              onClick={handleSaveEdit}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition-all"
                              style={{ backgroundColor: 'rgba(0,185,174,0.25)', border: '1px solid rgba(0,185,174,0.5)' }}
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-gray-400 bg-slate-700/60 border border-slate-600/40 transition-all"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="px-4 pb-3 flex items-center gap-2">
                            <button
                              onClick={() => { onLoadSimulation(entry); onClose(); }}
                              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Cargar
                            </button>
                            <span className="text-slate-600 text-xs">·</span>
                            <button
                              onClick={() => handleStartEdit(entry)}
                              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Editar nombre
                            </button>
                            <span className="text-slate-600 text-xs">·</span>
                            <button
                              onClick={() => setConfirmDeleteId(entry.id)}
                              className="flex items-center gap-1.5 text-xs text-red-500/70 hover:text-red-400 transition-colors"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Eliminar
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="px-4 pb-5 pt-3 border-t border-slate-700/60 flex-shrink-0 space-y-2">
            {selected.size >= 2 && (
              <button
                onClick={handleCompare}
                className="w-full py-2.5 text-sm font-semibold text-white rounded-xl transition-all"
                style={{ backgroundColor: 'rgba(0,185,174,0.2)', border: '1px solid rgba(0,185,174,0.5)', color: '#00B9AE' }}
              >
                Comparar {selected.size} simulaciones
              </button>
            )}
            <button
              onClick={handleClear}
              className="w-full py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/5 rounded-xl transition-all border border-red-400/20 hover:border-red-400/40"
            >
              Borrar historial
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
