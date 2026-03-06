import React, { useState } from 'react';
import { SimulationHistoryEntry, CreditType } from '../types';
import { getHistory, clearHistory } from '../services/historyService';

interface HistoryModalProps {
  onClose: () => void;
  onLoadSimulation: (entry: SimulationHistoryEntry) => void;
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

export const HistoryModal = ({ onClose, onLoadSimulation }: HistoryModalProps) => {
  const [history, setHistory] = useState<SimulationHistoryEntry[]>(getHistory);

  const handleClear = () => {
    clearHistory();
    setHistory([]);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-md bg-gradient-to-b from-slate-800 to-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-700/60 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">

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
              <p className="text-xs text-gray-400">Ultimas {history.length} simulaciones</p>
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
                return (
                  <button
                    key={entry.id}
                    onClick={() => { onLoadSimulation(entry); onClose(); }}
                    className="w-full text-left bg-slate-700/30 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/60 rounded-xl p-4 transition-all duration-200 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
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
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Cargar simulacion
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="px-4 pb-5 pt-3 border-t border-slate-700/60 flex-shrink-0">
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
