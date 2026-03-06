import React from 'react';
import { ScenarioEntry } from '../types';

interface ScenarioComparatorProps {
  scenarios: ScenarioEntry[];
  onClose: () => void;
  onRemove: (id: string) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-ES', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

const SCENARIO_COLORS = ['#00B9AE', '#3B82F6', '#F59E0B'];

export const ScenarioComparator = ({ scenarios, onClose, onRemove }: ScenarioComparatorProps) => {
  if (scenarios.length === 0) return null;

  const minCuota = Math.min(...scenarios.map((s) => s.cuotaMensual));
  const minTotal = Math.min(...scenarios.map((s) => s.terminasPagando));
  const minIntereses = Math.min(...scenarios.map((s) => s.totalInteres));

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-2xl bg-gradient-to-b from-slate-800 to-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-700/60 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

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
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Comparador de Escenarios</h2>
              <p className="text-xs text-gray-400">{scenarios.length} {scenarios.length === 1 ? 'escenario guardado' : 'escenarios guardados'}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">

          {scenarios.length === 1 && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <p className="text-xs text-amber-400 text-center">
                Agrega al menos un escenario mas para comparar
              </p>
            </div>
          )}

          <div className={`grid gap-4 ${scenarios.length >= 2 ? 'grid-cols-1' : ''}`}>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="py-3 text-left text-xs font-semibold text-gray-400 uppercase pr-4 min-w-[120px]">Metrica</th>
                    {scenarios.map((s, i) => (
                      <th key={s.id} className="py-3 text-center min-w-[130px]">
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SCENARIO_COLORS[i], boxShadow: `0 0 6px ${SCENARIO_COLORS[i]}80` }} />
                          <span className="text-xs font-bold" style={{ color: SCENARIO_COLORS[i] }}>{s.label}</span>
                          <span className="text-xs text-gray-500 font-normal leading-tight">{s.creditTitle}</span>
                          <button
                            onClick={() => onRemove(s.id)}
                            className="text-xs text-gray-600 hover:text-red-400 transition-colors mt-0.5"
                          >
                            Eliminar
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {[
                    { label: 'Monto solicitado', key: 'montoPrestamo' as keyof ScenarioEntry },
                    { label: 'Plazo', key: 'plazoAnios' as keyof ScenarioEntry, suffix: ' años' },
                    { label: 'TNA', key: 'tasaInteresAnual' as keyof ScenarioEntry, suffix: '%' },
                    { label: 'Cuota mensual', key: 'cuotaMensual' as keyof ScenarioEntry, isCurrency: true, bestIsMin: true },
                    { label: 'Total intereses', key: 'totalInteres' as keyof ScenarioEntry, isCurrency: true, bestIsMin: true },
                    { label: 'Total a pagar', key: 'terminasPagando' as keyof ScenarioEntry, isCurrency: true, bestIsMin: true },
                  ].map((row) => (
                    <tr key={row.key} className="hover:bg-slate-700/20 transition-colors">
                      <td className="py-3 pr-4 text-gray-400 text-sm">{row.label}</td>
                      {scenarios.map((s, i) => {
                        const val = s[row.key] as number;
                        let isBest = false;
                        if (scenarios.length >= 2 && row.bestIsMin) {
                          if (row.key === 'cuotaMensual') isBest = val === minCuota;
                          if (row.key === 'terminasPagando') isBest = val === minTotal;
                          if (row.key === 'totalInteres') isBest = val === minIntereses;
                        }

                        let displayVal = '';
                        if (row.isCurrency) {
                          displayVal = `$${formatCurrency(val)}`;
                        } else if (row.suffix) {
                          displayVal = `${val}${row.suffix}`;
                        } else {
                          displayVal = `$${formatCurrency(val)}`;
                        }

                        return (
                          <td key={s.id} className="py-3 text-center">
                            <span
                              className={`font-semibold text-sm ${isBest ? 'text-green-400' : 'text-white'}`}
                            >
                              {displayVal}
                              {isBest && scenarios.length >= 2 && (
                                <span className="ml-1 text-xs">✓</span>
                              )}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {scenarios.length >= 2 && (
              <div className="mt-2 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                <p className="text-xs text-green-400 text-center">
                  Los valores en verde representan la mejor opcion en cada categoria
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
