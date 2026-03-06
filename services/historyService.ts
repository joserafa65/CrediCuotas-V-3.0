import { SimulationHistoryEntry, CreditType, CalculationResults, LoanDetails } from '../types';

const HISTORY_KEY = 'simulationHistory_v1';
const MAX_ENTRIES = 10;

export const getHistory = (): SimulationHistoryEntry[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SimulationHistoryEntry[];
  } catch {
    return [];
  }
};

export const saveToHistory = (
  creditType: CreditType,
  creditTitle: string,
  details: LoanDetails,
  results: CalculationResults
): void => {
  try {
    const history = getHistory();
    const entry: SimulationHistoryEntry = {
      id: Date.now().toString(),
      creditType,
      creditTitle,
      montoPrestamo: details.montoPrestamo,
      plazoAnios: details.plazoAnios,
      tasaInteresAnual: details.tasaInteresAnual,
      cuotaMensual: results.cuotaMensual,
      totalInteres: results.totalInteres,
      terminasPagando: results.terminasPagando,
      date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
    const updated = [entry, ...history].slice(0, MAX_ENTRIES);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
  }
};

export const clearHistory = (): void => {
  localStorage.removeItem(HISTORY_KEY);
};
