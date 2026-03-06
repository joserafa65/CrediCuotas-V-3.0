export type FrecuenciaAbono = 'Una vez' | 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual';
export type CreditType = 'hipotecario' | 'vehicular' | 'microcredito' | 'consumo' | 'capacidad';

export interface SimulationHistoryEntry {
  id: string;
  creditType: CreditType;
  creditTitle: string;
  montoPrestamo: number;
  plazoAnios: number;
  tasaInteresAnual: number;
  cuotaMensual: number;
  totalInteres: number;
  terminasPagando: number;
  date: string;
}

export interface ScenarioEntry {
  id: string;
  label: string;
  creditType: CreditType;
  creditTitle: string;
  montoPrestamo: number;
  plazoAnios: number;
  tasaInteresAnual: number;
  cuotaMensual: number;
  totalInteres: number;
  terminasPagando: number;
}

export interface LoanDetails {
  valorPropiedad: number;
  montoPrestamo: number;
  plazoAnios: number;
  tasaInteresAnual: number;
  hacerAbonoExtra: boolean;
  montoAbonoExtra: number;
  frecuenciaAbonoExtra: FrecuenciaAbono;
  tipoAbonoExtra: 'reducir_plazo' | 'reducir_cuota';
  incluirSeguroDesgravamen: boolean;
  sumarGastosLegales: boolean;
  porcentajeGastosLegales: number;
  financiarGastosLegales: boolean;
  calcularSeguroVehicular: boolean;
  porcentajeSeguroVehicular: number;
  sumarSeguroACuota: boolean;
}

export interface AmortizationRow {
  periodo: number;
  cuota: number;
  interes: number;
  capital: number;
  abonoExtra: number;
  saldoRestante: number;
}

export interface CalculationResults {
  cuotaMensual: number;
  totalPagado: number;
  totalInteres: number;
  tablaAmortizacion: AmortizationRow[];
  terminasPagando: number;
  gastosLegales?: number;
  ahorroTotal?: number;
  mesesAhorrados?: number;
  nuevaTablaAmortizacion?: AmortizationRow[];
  nuevaCuotaMensual?: number;
  seguroVehicular?: number;
}
