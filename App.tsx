import React, { useState, useMemo, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  LoanDetails,
  CalculationResults,
  FrecuenciaAbono,
  CreditType,
  SimulationHistoryEntry,
  ScenarioEntry,
} from './types';
import { calculateLoan } from './services/loanCalculator';
import { generatePdf } from './services/pdfGenerator';
import { generateExcel } from './services/excelGenerator';
import { saveToHistory } from './services/historyService';
import {
  ArrowLeftIcon,
  PartyPopperIcon,
  BuildingsIcon,
  DownloadIcon,
  TableCellsIcon,
  CarIcon,
  TractorIcon,
  ShoppingCartIcon
} from './components/icons';
import { Onboarding } from './components/Onboarding';
import { usePurchase } from './context/PurchaseContext';
import { PaywallModal } from './components/PaywallModal';
import { SettingsModal } from './components/SettingsModal';
import { HistoryModal } from './components/HistoryModal';
import { CapacidadSimulator } from './components/CapacidadSimulator';
import { DonutChart } from './components/DonutChart';
import { ScenarioComparator } from './components/ScenarioComparator';

type Screen = 'menu' | 'simulator' | 'capacidad';

const baseLoanDetails: Omit<
  LoanDetails,
  'valorPropiedad' | 'montoPrestamo' | 'plazoAnios' | 'tasaInteresAnual'
> = {
  hacerAbonoExtra: false,
  montoAbonoExtra: 0,
  frecuenciaAbonoExtra: 'Mensual',
  tipoAbonoExtra: 'reducir_plazo',
  incluirSeguroDesgravamen: false,
  sumarGastosLegales: false,
  porcentajeGastosLegales: 1.5,
  financiarGastosLegales: false,
  calcularSeguroVehicular: false,
  porcentajeSeguroVehicular: 4,
  sumarSeguroACuota: false
};

const creditTypeConfig: Record<
  Exclude<CreditType, 'capacidad'>,
  {
    title: string;
    Icon: React.ComponentType<{ className?: string }>;
    propertyLabel: string;
    defaultDetails: LoanDetails;
  }
> = {
  hipotecario: {
    title: 'Credito Hipotecario',
    Icon: BuildingsIcon,
    propertyLabel: '¿Cuanto vale mi nueva propiedad?',
    defaultDetails: {
      ...baseLoanDetails,
      valorPropiedad: 150000,
      montoPrestamo: 120000,
      plazoAnios: 20,
      tasaInteresAnual: 9.5
    }
  },
  vehicular: {
    title: 'Credito Vehicular',
    Icon: CarIcon,
    propertyLabel: '¿Cuanto vale el vehiculo?',
    defaultDetails: {
      ...baseLoanDetails,
      valorPropiedad: 25000,
      montoPrestamo: 20000,
      plazoAnios: 5,
      tasaInteresAnual: 15.6,
      porcentajeGastosLegales: 5
    }
  },
  microcredito: {
    title: 'Microcredito',
    Icon: TractorIcon,
    propertyLabel: '¿Cual es el valor del activo?',
    defaultDetails: {
      ...baseLoanDetails,
      valorPropiedad: 10000,
      montoPrestamo: 8000,
      plazoAnios: 3,
      tasaInteresAnual: 20.5
    }
  },
  consumo: {
    title: 'Credito de Consumo',
    Icon: ShoppingCartIcon,
    propertyLabel: '¿Cual es el monto del credito?',
    defaultDetails: {
      ...baseLoanDetails,
      valorPropiedad: 5000,
      montoPrestamo: 5000,
      plazoAnios: 2,
      tasaInteresAnual: 15.8
    }
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-ES', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const PREMIUM_CREDIT_TYPES: CreditType[] = ['hipotecario', 'vehicular', 'microcredito', 'capacidad'];

const NumericInput = ({
  value,
  onChange,
  className,
  placeholder,
  id,
  allowDecimal = false,
}: {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
  id?: string;
  allowDecimal?: boolean;
}) => {
  const [localValue, setLocalValue] = React.useState(value === 0 ? '' : String(value));
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    if (!focused) {
      setLocalValue(value === 0 ? '' : String(value));
    }
  }, [value, focused]);

  return (
    <input
      id={id}
      type="text"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      placeholder={placeholder ?? '0'}
      value={focused ? localValue : (value === 0 ? '' : String(value))}
      onFocus={() => {
        setFocused(true);
        setLocalValue(value === 0 ? '' : String(value));
      }}
      onChange={(e) => {
        const pattern = allowDecimal ? /[^0-9.]/g : /[^0-9]/g;
        const raw = e.target.value.replace(pattern, '');
        setLocalValue(raw);
        const num = parseFloat(raw);
        onChange(isNaN(num) ? 0 : num);
      }}
      onBlur={() => {
        setFocused(false);
        const num = parseFloat(localValue);
        const clean = isNaN(num) ? 0 : num;
        setLocalValue(clean === 0 ? '' : String(clean));
        onChange(clean);
      }}
      className={className}
    />
  );
};

const App = () => {
  const { isPremium } = usePurchase();
  const [showPaywall, setShowPaywall] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [screen, setScreen] = useState<Screen>('menu');
  const [simulationToLoad, setSimulationToLoad] = useState<{
    details: LoanDetails;
    type: Exclude<CreditType, 'capacidad'>;
  } | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioEntry[]>([]);
  const [showComparator, setShowComparator] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding_v2');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => setShowSplash(false), 500);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleSplashClick = () => {
    setFadeOut(true);
    setTimeout(() => setShowSplash(false), 500);
  };

  const startSimulation = (type: CreditType) => {
    if (type === 'capacidad') {
      setScreen('capacidad');
      return;
    }
    setSimulationToLoad({
      details: creditTypeConfig[type].defaultDetails,
      type
    });
    setScreen('simulator');
  };

  const backToMenu = () => {
    setSimulationToLoad(null);
    setScreen('menu');
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('hasSeenOnboarding_v2', 'true');
    setShowOnboarding(false);
  };

  const handleLoadHistoryEntry = (entry: SimulationHistoryEntry) => {
    if (entry.creditType === 'capacidad') {
      setScreen('capacidad');
      return;
    }
    const type = entry.creditType as Exclude<CreditType, 'capacidad'>;
    const baseConfig = creditTypeConfig[type].defaultDetails;
    setSimulationToLoad({
      details: {
        ...baseConfig,
        montoPrestamo: entry.montoPrestamo,
        plazoAnios: entry.plazoAnios,
        tasaInteresAnual: entry.tasaInteresAnual,
      },
      type,
    });
    setScreen('simulator');
  };

  const handleAddScenario = (scenario: ScenarioEntry) => {
    setScenarios((prev) => {
      const existing = prev.find(
        (s) => s.creditType === scenario.creditType &&
          s.montoPrestamo === scenario.montoPrestamo &&
          s.plazoAnios === scenario.plazoAnios &&
          s.tasaInteresAnual === scenario.tasaInteresAnual
      );
      if (existing) return prev;
      if (prev.length >= 3) return [...prev.slice(1), scenario];
      return [...prev, scenario];
    });
  };

  const handleRemoveScenario = (id: string) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  };

  if (showSplash) {
    return (
      <div
        onClick={handleSplashClick}
        className={`fixed inset-0 w-full h-full flex items-center justify-center cursor-pointer z-50 ${fadeOut ? 'splash-fadeOut' : 'splash-fadeIn'}`}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      >
        <img
          src="/logocredicuotaspantallainicio_02.webp"
          alt="CrediCuotas"
          className="w-full h-full object-cover"
          style={{ maxWidth: '100%', maxHeight: '100%' }}
        />
      </div>
    );
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-slate-900 to-gray-900 text-gray-100">
      <header className="fixed top-0 left-0 w-full h-[80px] z-50 bg-transparent pointer-events-none">
        <div id="top-ad" className="pointer-events-auto"></div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-6 sm:px-6 sm:py-8 md:px-8 max-w-5xl pt-[80px] pb-[100px]">
        {screen === 'menu' && (
          <MainMenu
            onStart={startSimulation}
            isPremium={isPremium}
            onShowPaywall={() => setShowPaywall(true)}
            onShowSettings={() => setShowSettings(true)}
            onShowHistory={() => setShowHistory(true)}
            scenariosCount={scenarios.length}
            onShowComparator={() => setShowComparator(true)}
          />
        )}
        {screen === 'simulator' && simulationToLoad && (
          <Simulator
            onBack={backToMenu}
            creditType={simulationToLoad.type}
            initialDetails={simulationToLoad.details}
            isPremium={isPremium}
            onShowPaywall={() => setShowPaywall(true)}
            onAddScenario={handleAddScenario}
            scenarios={scenarios}
            onShowComparator={() => setShowComparator(true)}
          />
        )}
        {screen === 'capacidad' && (
          <div>
            <div className="px-5 md:px-7">
              <button
                onClick={backToMenu}
                className="flex items-center gap-2 bg-turquoise/90 text-white font-medium px-5 py-2.5 rounded-full hover:bg-turquoise transition-colors mb-6 shadow-md"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Volver al menu
              </button>
            </div>
            <CapacidadSimulator />
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 w-full h-[100px] z-50 bg-transparent pointer-events-none">
        <div id="bottom-ad" className="pointer-events-auto"></div>
      </footer>

      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showHistory && (
        <HistoryModal
          onClose={() => setShowHistory(false)}
          onLoadSimulation={handleLoadHistoryEntry}
        />
      )}
      {showComparator && (
        <ScenarioComparator
          scenarios={scenarios}
          onClose={() => setShowComparator(false)}
          onRemove={handleRemoveScenario}
        />
      )}
    </div>
  );
};

const MainMenu = ({
  onStart,
  isPremium,
  onShowPaywall,
  onShowSettings,
  onShowHistory,
  scenariosCount,
  onShowComparator,
}: {
  onStart: (type: CreditType) => void;
  isPremium: boolean;
  onShowPaywall: () => void;
  onShowSettings: () => void;
  onShowHistory: () => void;
  scenariosCount: number;
  onShowComparator: () => void;
}) => {
  const customIcons: Record<Exclude<CreditType, 'capacidad'>, string> = {
    hipotecario: "/icons/Hipotecario.svg",
    vehicular: "/icons/Vehicular.svg",
    microcredito: "/icons/Microcredito.svg",
    consumo: "/icons/Consumo.svg"
  };

  const mainTypes: Exclude<CreditType, 'capacidad'>[] = ['hipotecario', 'vehicular', 'microcredito', 'consumo'];

  return (
    <div className="flex flex-col items-center text-center min-h-[calc(100vh-7rem)] sm:min-h-[calc(100vh-8rem)]">
      <div className="pt-8 md:pt-12 w-full">

        <div className="flex justify-center mb-3">
          <img
            src="/logo_credicuotas_baner_arriba_02.png"
            alt="CrediCuotas"
            className="h-14 sm:h-16 md:h-20 w-auto object-contain max-w-full px-4"
          />
        </div>

        <p className="mt-3 text-base md:text-lg text-gray-400 font-light">
          Simulador universal para tus creditos
        </p>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mx-auto">
          {mainTypes.map((type) => {
            const { title } = creditTypeConfig[type];
            const iconPath = customIcons[type];
            const isPremiumType = PREMIUM_CREDIT_TYPES.includes(type);
            const locked = isPremiumType && !isPremium;

            return (
              <button
                key={type}
                onClick={() => locked ? onShowPaywall() : onStart(type)}
                className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900
                           border-2 rounded-2xl p-4 transition-all duration-300
                           hover:shadow-2xl hover:-translate-y-1"
                style={{ borderColor: locked ? 'rgba(156,163,175,0.2)' : 'rgba(0,185,174,0.3)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-turquoise/0 to-turquoise/0
                                group-hover:from-turquoise/10 group-hover:to-turquoise/5 transition-all duration-300" />

                {locked && (
                  <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'transparent', border: '2px solid #F59E0B', boxShadow: '0 0 8px rgba(245,158,11,0.6)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5 text-amber-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                )}

                <div className="relative flex flex-col items-center gap-3">
                  <div
                    className="w-12 h-12 flex items-center justify-center rounded-full overflow-hidden transition-all duration-300 group-active:scale-110"
                    style={{
                      backgroundColor: locked ? 'rgba(156,163,175,0.08)' : 'rgba(0,185,174,0.1)',
                      border: locked ? '2px solid rgba(156,163,175,0.2)' : '2px solid rgba(0,185,174,0.3)',
                      opacity: locked ? 0.6 : 1,
                    }}
                  >
                    <img
                      src={iconPath}
                      alt={title}
                      className="w-7 h-7 object-contain select-none"
                      draggable={false}
                      style={{ filter: locked ? 'grayscale(1) opacity(0.5)' : 'none' }}
                    />
                  </div>

                  <span className="text-lg font-bold transition-colors duration-300" style={{ color: locked ? 'rgba(156,163,175,0.7)' : 'white' }}>
                    {title}
                  </span>

                  {locked && (
                    <span className="text-xs text-gray-500 font-medium -mt-1">Simulador avanzado<br />Disponible en Premium</span>
                  )}
                </div>
              </button>
            );
          })}

          <button
            onClick={() => isPremium ? onStart('capacidad') : onShowPaywall()}
            className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900
                       border-2 rounded-2xl p-4 transition-all duration-300
                       hover:shadow-2xl hover:-translate-y-1 sm:col-span-2"
            style={{ borderColor: !isPremium ? 'rgba(156,163,175,0.2)' : 'rgba(59,130,246,0.35)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/0
                            group-hover:from-blue-500/5 group-hover:to-blue-500/3 transition-all duration-300" />

            {!isPremium && (
              <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'transparent', border: '2px solid #F59E0B', boxShadow: '0 0 8px rgba(245,158,11,0.6)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5 text-amber-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            )}

            <div className="relative flex flex-row items-center gap-4 justify-center">
              <div
                className="w-12 h-12 flex items-center justify-center rounded-full overflow-hidden transition-all duration-300 group-active:scale-110 flex-shrink-0"
                style={{
                  backgroundColor: !isPremium ? 'rgba(156,163,175,0.08)' : 'rgba(59,130,246,0.1)',
                  border: !isPremium ? '2px solid rgba(156,163,175,0.2)' : '2px solid rgba(59,130,246,0.3)',
                  opacity: !isPremium ? 0.6 : 1,
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke={!isPremium ? 'rgba(156,163,175,0.5)' : '#3B82F6'} strokeWidth={1.8} className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-left">
                <span className="text-lg font-bold transition-colors duration-300 block" style={{ color: !isPremium ? 'rgba(156,163,175,0.7)' : 'white' }}>
                  Capacidad de Pago
                </span>
                {!isPremium ? (
                  <span className="text-xs text-gray-500 font-medium">Disponible en Premium</span>
                ) : (
                  <span className="text-xs text-gray-400 font-medium">Descubre cuanto credito puedes solicitar</span>
                )}
              </div>
            </div>
          </button>
        </div>

        {!isPremium && (
          <div className="mt-6 max-w-2xl mx-auto">
            <button
              onClick={onShowPaywall}
              className="w-full py-3 px-5 rounded-2xl border border-amber-400/40 bg-transparent hover:bg-amber-400/5 transition-all duration-200 flex items-center justify-between gap-3"
              style={{ boxShadow: '0 0 12px rgba(245,158,11,0.15)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'transparent', border: '2px solid #F59E0B', boxShadow: '0 0 8px rgba(245,158,11,0.4)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 text-amber-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-amber-400">Desbloquear Premium</p>
                  <p className="text-xs text-gray-400">Accede a todos los simuladores</p>
                </div>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth={2} className="w-4 h-4 flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {scenariosCount > 0 && (
          <div className="mt-4 max-w-2xl mx-auto">
            <button
              onClick={onShowComparator}
              className="w-full py-3 px-5 rounded-2xl border border-turquoise/40 bg-turquoise/5 hover:bg-turquoise/10 transition-all duration-200 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-turquoise/20">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#00B9AE" strokeWidth={2} className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-turquoise">Ver Comparador</p>
                  <p className="text-xs text-gray-400">{scenariosCount} {scenariosCount === 1 ? 'escenario guardado' : 'escenarios guardados'}</p>
                </div>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="#00B9AE" strokeWidth={2} className="w-4 h-4 flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="mt-auto pt-10 pb-4 w-full">
        <div className="max-w-2xl mx-auto text-xs text-gray-500 text-center space-y-2 leading-relaxed">
          <p>
            Las tasas de interes y los resultados presentados en este simulador
            son referenciales y aproximados, calculados con base en los rangos
            establecidos por el Banco Central del Ecuador (BCE) para cada uno de los segmentos.
          </p>
          <p>
            Los valores finales pueden variar segun el perfil crediticio del solicitante,
            politicas internas de cada institucion financiera, y costos adicionales.
          </p>
          <p>
            El resultado no constituye una oferta vinculante ni un compromiso de credito.
          </p>
        </div>

        <div className="flex justify-center gap-3 mt-5">
          <button
            onClick={onShowHistory}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-slate-800/60 transition-all border-2"
            style={{ borderColor: 'rgba(0,185,174,0.3)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs">Historial</span>
          </button>
          <button
            onClick={onShowSettings}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-slate-800/60 transition-all border-2"
            style={{ borderColor: 'rgba(0,185,174,0.3)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs">Configuracion</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const Simulator = ({
  onBack,
  initialDetails,
  creditType,
  isPremium,
  onShowPaywall,
  onAddScenario,
  scenarios,
  onShowComparator,
}: {
  onBack: () => void;
  initialDetails: Partial<LoanDetails>;
  creditType: Exclude<CreditType, 'capacidad'>;
  isPremium: boolean;
  onShowPaywall: () => void;
  onAddScenario: (s: ScenarioEntry) => void;
  scenarios: ScenarioEntry[];
  onShowComparator: () => void;
}) => {
  const config = creditTypeConfig[creditType];

  const initialEntrada = config.defaultDetails.valorPropiedad - config.defaultDetails.montoPrestamo;
  const initialPorcentajeEntrada = config.defaultDetails.valorPropiedad > 0
    ? initialEntrada / config.defaultDetails.valorPropiedad
    : 0;

  const [details, setDetails] = useState<LoanDetails>({
    ...baseLoanDetails,
    ...config.defaultDetails,
    ...initialDetails
  });
  const [porcentajeEntrada, setPorcentajeEntrada] = useState(initialPorcentajeEntrada);
  const [porcentajeEntradaInput, setPorcentajeEntradaInput] = useState(
    String(Math.round(initialPorcentajeEntrada * 100))
  );
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  useEffect(() => {
    const defaultDetails = { ...baseLoanDetails, ...config.defaultDetails, ...initialDetails };
    setDetails(defaultDetails);
    const e = defaultDetails.valorPropiedad - defaultDetails.montoPrestamo;
    const pct = defaultDetails.valorPropiedad > 0 ? e / defaultDetails.valorPropiedad : 0;
    setPorcentajeEntrada(pct);
    setPorcentajeEntradaInput(String(Math.round(pct * 100)));
    setResults(null);
  }, [initialDetails, creditType]);

  const entrada = useMemo(
    () => details.valorPropiedad - details.montoPrestamo,
    [details.valorPropiedad, details.montoPrestamo]
  );

  const porcentajeEntradaDisplay = useMemo(
    () => details.valorPropiedad > 0 ? (entrada / details.valorPropiedad) * 100 : 0,
    [entrada, details.valorPropiedad]
  );

  const minEntradaWarning = useMemo(() => {
    if (creditType === 'hipotecario' && details.valorPropiedad > 0) {
      const pct = (entrada / details.valorPropiedad) * 100;
      if (pct < 20) return 'Los bancos suelen requerir una entrada minima de 20% para este tipo de credito.';
    }
    if (creditType === 'vehicular' && details.valorPropiedad > 0) {
      const pct = (entrada / details.valorPropiedad) * 100;
      if (pct < 15) return 'Los bancos suelen requerir una entrada minima de 15% para este tipo de credito.';
    }
    if (creditType === 'microcredito' && details.valorPropiedad > 0) {
      const pct = (entrada / details.valorPropiedad) * 100;
      if (pct < 10) return 'Muchos microcreditos solicitan una garantia o respaldo cercano al 10% del monto solicitado.';
    }
    return null;
  }, [creditType, entrada, details.valorPropiedad]);

  const handleDetailChange = (field: keyof LoanDetails, value: any) => {
    setDetails((prev) => ({ ...prev, [field]: value }));
  };

  const handleValorPropiedadChange = (value: number) => {
    if (creditType === 'consumo') {
      setDetails((prev) => ({ ...prev, valorPropiedad: value, montoPrestamo: value }));
      return;
    }
    const newEntrada = value * porcentajeEntrada;
    const clampedEntrada = Math.min(newEntrada, value);
    const newMontoPrestamo = value - clampedEntrada;
    setDetails((prev) => ({ ...prev, valorPropiedad: value, montoPrestamo: Math.max(0, newMontoPrestamo) }));
  };

  const handleEntradaChange = (value: number) => {
    if (details.valorPropiedad === 0) return;
    const clampedEntrada = Math.min(value, details.valorPropiedad);
    const newMontoPrestamo = details.valorPropiedad - clampedEntrada;
    const newPct = clampedEntrada / details.valorPropiedad;
    setPorcentajeEntrada(newPct);
    setPorcentajeEntradaInput(String(Math.round(newPct * 100)));
    setDetails((prev) => ({ ...prev, montoPrestamo: Math.max(0, newMontoPrestamo) }));
  };

  const handlePorcentajeEntradaChange = (pct: number) => {
    if (details.valorPropiedad === 0) return;
    const clampedPct = Math.min(Math.max(pct, 0), 100);
    const newEntrada = details.valorPropiedad * (clampedPct / 100);
    const newMontoPrestamo = details.valorPropiedad - newEntrada;
    setPorcentajeEntrada(clampedPct / 100);
    setPorcentajeEntradaInput(String(clampedPct));
    setDetails((prev) => ({ ...prev, montoPrestamo: Math.max(0, newMontoPrestamo) }));
  };

  const handleCalculate = () => {
    const calculatedResults = calculateLoan(details);
    setResults(calculatedResults);
    if (calculatedResults) {
      saveToHistory(creditType, config.title, details, calculatedResults);
    }
  };

  return (
    <div>
      <div className="px-5 md:px-7">
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-turquoise/90 text-white font-medium px-5 py-2.5 rounded-full hover:bg-turquoise transition-colors mb-6 shadow-md"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Volver al menu
        </button>

        <header className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Simulador de {config.title}
            </h2>
            <p className="text-gray-300 mt-2 text-sm md:text-base font-light">
              Ingresa los datos para simular tu credito.
            </p>
            <p className="text-xs text-gray-500 mt-2.5 italic max-w-md leading-relaxed">
              Los resultados obtenidos son un ejercicio estimativo y pueden variar
              segun la entidad financiera, el perfil del solicitante, y las
              condiciones especificas del credito.
            </p>
          </div>
        </header>
      </div>

      <div className="bg-slate-800/40 border border-slate-700/60 p-5 md:p-7 rounded-2xl shadow-lg">
        <div className="space-y-5 mb-7">
          <div>
            <label className="block font-semibold text-white text-sm mb-2">
              {config.propertyLabel}
            </label>
            <input
              type="text"
              value={`$ ${formatCurrency(details.valorPropiedad)}`}
              onChange={(e) => handleValorPropiedadChange(Number(e.target.value.replace(/[^0-9]/g, '')))}
              className="w-full p-3 bg-gray-700/80 border border-gray-600 rounded-lg focus:ring-2 focus:ring-turquoise focus:border-turquoise font-semibold text-white transition-all"
            />
          </div>

          {creditType !== 'consumo' && (
            <>
              <div>
                <label className="block font-semibold text-white text-sm mb-2">
                  {creditType === 'microcredito' ? '¿De cuanto es la garantia?' : '¿De cuanto es la entrada?'}
                </label>

                {creditType === 'hipotecario' && (
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => handlePorcentajeEntradaChange(10)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                        Math.round(porcentajeEntradaDisplay) === 10
                          ? 'bg-turquoise border-turquoise text-white'
                          : 'bg-gray-700/60 border-gray-600 text-gray-300 hover:border-turquoise hover:text-white'
                      }`}
                    >
                      10%
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePorcentajeEntradaChange(20)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                        Math.round(porcentajeEntradaDisplay) === 20
                          ? 'bg-turquoise border-turquoise text-white'
                          : 'bg-gray-700/60 border-gray-600 text-gray-300 hover:border-turquoise hover:text-white'
                      }`}
                    >
                      20%
                    </button>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={porcentajeEntradaInput}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, '');
                          setPorcentajeEntradaInput(raw);
                        }}
                        onBlur={() => {
                          const num = parseInt(porcentajeEntradaInput, 10);
                          if (!isNaN(num)) handlePorcentajeEntradaChange(num);
                          else setPorcentajeEntradaInput(String(Math.round(porcentajeEntradaDisplay)));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const num = parseInt(porcentajeEntradaInput, 10);
                            if (!isNaN(num)) handlePorcentajeEntradaChange(num);
                          }
                        }}
                        placeholder="0"
                        className="w-16 p-2 bg-gray-700/80 border border-gray-600 rounded-lg focus:ring-2 focus:ring-turquoise focus:border-turquoise font-semibold text-white text-center transition-all text-sm"
                      />
                      <span className="text-gray-400 font-semibold text-sm">%</span>
                    </div>
                  </div>
                )}

                <input
                  type="text"
                  value={`$ ${formatCurrency(entrada)}`}
                  onChange={(e) => handleEntradaChange(Number(e.target.value.replace(/[^0-9]/g, '')))}
                  className="w-full p-3 bg-gray-700/80 border border-gray-600 rounded-lg focus:ring-2 focus:ring-turquoise focus:border-turquoise font-semibold text-white transition-all"
                />
                {minEntradaWarning && (
                  <p className="text-xs text-amber-400 mt-1.5 flex items-start gap-1">
                    <span>⚠️</span>
                    <span>{minEntradaWarning}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block font-semibold text-white text-sm mb-2">
                    ¿Cuanto necesito?
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`$ ${formatCurrency(details.montoPrestamo)}`}
                    className="w-full p-3 bg-slate-800/40 border border-slate-600/40 rounded-lg font-semibold text-gray-300 cursor-default"
                  />
                </div>
                {creditType !== 'hipotecario' && (
                  <div>
                    <label className="block font-semibold text-white text-sm mb-2">
                      {creditType === 'microcredito' ? '% de garantia' : '% de entrada'}
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`${porcentajeEntradaDisplay.toFixed(1)}%`}
                      className="w-full p-3 bg-slate-800/40 border border-slate-600/40 rounded-lg font-semibold text-gray-300 cursor-default"
                    />
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 italic -mt-2">
                Los valores se calculan automaticamente segun el valor del activo y la entrada.
              </p>
            </>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-5 mb-2">
          <div>
            <label htmlFor="plazo" className="block font-semibold text-white text-sm mb-2">
              ¿En cuanto tiempo deseo pagar?
            </label>
            <select
              id="plazo"
              value={details.plazoAnios}
              onChange={(e) => handleDetailChange('plazoAnios', Number(e.target.value))}
              className="w-full p-3 bg-gray-700/80 border border-gray-600 rounded-lg focus:ring-2 focus:ring-turquoise focus:border-turquoise text-white transition-all"
            >
              {Array.from(
                { length: creditType === 'hipotecario' ? 28 : 8 },
                (_, i) => i + (creditType === 'hipotecario' ? 3 : 1)
              ).map((y) => (
                <option key={y} value={y}>{y} años</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tasa" className="block font-semibold text-white text-sm mb-2">
              Tasa Nominal Anual (TNA)
            </label>
            <NumericInput
              id="tasa"
              value={details.tasaInteresAnual}
              onChange={(val) => handleDetailChange('tasaInteresAnual', val)}
              allowDecimal={true}
              className="w-full p-3 bg-gray-700/80 border border-gray-600 rounded-lg focus:ring-2 focus:ring-turquoise focus:border-turquoise text-white transition-all"
            />
          </div>
        </div>

        <p className="text-sm text-gray-400 text-center mb-7 leading-relaxed">
          Este % es referencial. Puedes cambiarla si la entidad te ha proporcionado una Tasa Nominal Anual (TNA).
        </p>

        <button
          onClick={() => setShowAdvancedOptions((prev) => !prev)}
          className="w-full mb-7 py-3 bg-slate-700/80 text-white font-medium rounded-xl hover:bg-slate-600 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          {showAdvancedOptions ? '▼ Ocultar opciones avanzadas' : '▶ Mas opciones'}
        </button>

        {showAdvancedOptions && (
          <>
            <div className="mb-5">
              <p className="font-semibold text-white text-sm mb-2.5">
                ¿Deseas que sumemos seguro de desgravamen?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDetailChange('incluirSeguroDesgravamen', true)}
                  className={`px-5 py-2 rounded-lg transition-all text-sm ${
                    details.incluirSeguroDesgravamen ? 'bg-turquoise text-white' : 'bg-gray-700/80 text-white hover:bg-gray-600'
                  }`}
                >
                  Si
                </button>
                <button
                  onClick={() => handleDetailChange('incluirSeguroDesgravamen', false)}
                  className={`px-5 py-2 rounded-lg transition-all text-sm ${
                    !details.incluirSeguroDesgravamen ? 'bg-turquoise text-white' : 'bg-gray-700/80 text-white hover:bg-gray-600'
                  }`}
                >
                  No
                </button>
              </div>
              {details.incluirSeguroDesgravamen && (
                <p className="text-xs text-gray-400 mt-2 px-1 leading-relaxed">
                  Se sumara un 0,04% del monto del prestamo a cada cuota mensual.
                </p>
              )}
            </div>

            {creditType === 'vehicular' && (
              <div className="mb-5">
                <p className="font-semibold text-white text-sm mb-2.5">
                  ¿Deseas tener un estimado de cuanto costara el seguro para tu vehiculo?
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleDetailChange('calcularSeguroVehicular', true)}
                      className={`px-5 py-2 rounded-lg transition-all text-sm ${
                        details.calcularSeguroVehicular ? 'bg-turquoise text-white' : 'bg-gray-700/80 text-white hover:bg-gray-600'
                      }`}
                    >
                      Si
                    </button>
                    <button
                      onClick={() => handleDetailChange('calcularSeguroVehicular', false)}
                      className={`px-5 py-2 rounded-lg transition-all text-sm ${
                        !details.calcularSeguroVehicular ? 'bg-turquoise text-white' : 'bg-gray-700/80 text-white hover:bg-gray-600'
                      }`}
                    >
                      No
                    </button>
                  </div>
                  {details.calcularSeguroVehicular && (
                    <div className="relative">
                      <NumericInput
                        value={details.porcentajeSeguroVehicular}
                        onChange={(val) => handleDetailChange('porcentajeSeguroVehicular', val)}
                        allowDecimal={true}
                        className="w-24 p-2 pr-6 bg-gray-700/80 border border-gray-600 rounded-lg focus:ring-2 focus:ring-turquoise focus:border-turquoise text-center font-semibold text-sm text-white"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                    </div>
                  )}
                </div>
                {details.calcularSeguroVehicular && (
                  <>
                    <p className="text-xs text-gray-400 mt-2 px-1 leading-relaxed">
                      Este calculo es referencial entre el 3% y el 7% segun el valor de tu vehiculo y tu perfil personal.
                    </p>
                    <div className="mt-3 flex items-center gap-3 bg-slate-900/50 p-2.5 rounded-lg border border-slate-700/50">
                      <input
                        type="checkbox"
                        id="sumar-seguro-cuota"
                        checked={details.sumarSeguroACuota}
                        onChange={(e) => handleDetailChange('sumarSeguroACuota', e.target.checked)}
                        className="h-5 w-5 rounded border-gray-500 bg-gray-700 text-turquoise focus:ring-turquoise focus:ring-offset-slate-800"
                      />
                      <label htmlFor="sumar-seguro-cuota" className="text-sm font-medium text-gray-200 cursor-pointer select-none">
                        ¿Deseas sumar el seguro a la cuota mensual?
                      </label>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="mb-5">
              <p className="font-semibold text-white text-sm mb-2.5">
                {creditType === 'vehicular'
                  ? '¿Deseas sumar un valor extra por tramites legales, impuestos o matriculacion?'
                  : '¿Deseas sumar un valor extra por tramites legales o impuestos especiales?'}
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDetailChange('sumarGastosLegales', true)}
                    className={`px-5 py-2 rounded-lg transition-all text-sm ${
                      details.sumarGastosLegales ? 'bg-turquoise text-white' : 'bg-gray-700/80 text-white hover:bg-gray-600'
                    }`}
                  >
                    Si
                  </button>
                  <button
                    onClick={() => handleDetailChange('sumarGastosLegales', false)}
                    className={`px-5 py-2 rounded-lg transition-all text-sm ${
                      !details.sumarGastosLegales ? 'bg-turquoise text-white' : 'bg-gray-700/80 text-white hover:bg-gray-600'
                    }`}
                  >
                    No
                  </button>
                </div>
                {details.sumarGastosLegales && (
                  <div className="relative">
                    <NumericInput
                      value={details.porcentajeGastosLegales}
                      onChange={(val) => handleDetailChange('porcentajeGastosLegales', val)}
                      allowDecimal={true}
                      className="w-28 p-2 pr-6 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-turquoise focus:border-turquoise text-center font-semibold text-white"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                  </div>
                )}
              </div>
              {details.sumarGastosLegales && (
                <p className="text-xs text-gray-400 mt-2 px-1 leading-relaxed">
                  {creditType === 'vehicular'
                    ? 'Recomendado: 5%. Se calculara este porcentaje del monto del prestamo como un valor por gastos por ejemplo la matriculacion. Este valor es un pago unico que se suma al total que terminas pagando.'
                    : `Recomendado: 1.5%. Se calculara este porcentaje del monto del prestamo como un valor por gastos.${
                        details.financiarGastosLegales
                          ? ' Este valor se sumara al capital del prestamo y afectara tus cuotas.'
                          : ' Este valor es un pago unico que se suma al total que terminas pagando.'
                      }`}
                </p>
              )}
              {details.sumarGastosLegales && (
                <div className="mt-3 flex items-center gap-3 bg-slate-900/50 p-2.5 rounded-lg border border-slate-700/50">
                  <input
                    type="checkbox"
                    id="financiar-gastos"
                    checked={details.financiarGastosLegales}
                    onChange={(e) => handleDetailChange('financiarGastosLegales', e.target.checked)}
                    className="h-5 w-5 rounded border-gray-500 bg-gray-700 text-turquoise focus:ring-turquoise focus:ring-offset-slate-800"
                  />
                  <label htmlFor="financiar-gastos" className="text-sm font-medium text-gray-200 cursor-pointer select-none">
                    ¿Deseas sumar el valor al prestamo?
                  </label>
                </div>
              )}
            </div>

            <div className="mb-5">
              <p className="font-semibold text-white text-sm mb-2.5">
                ¿Deseas hacer abonos extras?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDetailChange('hacerAbonoExtra', true)}
                  className={`px-5 py-2 rounded-lg transition-all text-sm ${
                    details.hacerAbonoExtra ? 'bg-turquoise text-white' : 'bg-gray-700/80 text-white hover:bg-gray-600'
                  }`}
                >
                  Si
                </button>
                <button
                  onClick={() => handleDetailChange('hacerAbonoExtra', false)}
                  className={`px-5 py-2 rounded-lg transition-all text-sm ${
                    !details.hacerAbonoExtra ? 'bg-turquoise text-white' : 'bg-gray-700/80 text-white hover:bg-gray-600'
                  }`}
                >
                  No
                </button>
              </div>
              {details.hacerAbonoExtra && (
                <div className="space-y-4 mt-3 p-4 md:p-5 bg-slate-900/50 border border-slate-700/50 rounded-lg">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-sm text-gray-200 mb-2">
                        Monto del abono
                      </label>
                      <NumericInput
                        value={details.montoAbonoExtra}
                        onChange={(val) => handleDetailChange('montoAbonoExtra', val)}
                        placeholder="0"
                        className="w-full p-2.5 bg-gray-700/80 border border-gray-600 rounded-lg focus:ring-2 focus:ring-turquoise focus:border-turquoise text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-sm text-gray-200 mb-2">
                        Frecuencia
                      </label>
                      <select
                        value={details.frecuenciaAbonoExtra}
                        onChange={(e) => handleDetailChange('frecuenciaAbonoExtra', e.target.value as FrecuenciaAbono)}
                        className="w-full p-2.5 bg-gray-700/80 border border-gray-600 rounded-lg focus:ring-2 focus:ring-turquoise focus:border-turquoise text-white text-sm"
                      >
                        {(['Una vez', 'Mensual', 'Trimestral', 'Semestral', 'Anual'] as FrecuenciaAbono[]).map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-200 mb-2.5">
                      Aplicar abono para:
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleDetailChange('tipoAbonoExtra', 'reducir_plazo')}
                        className={`px-4 py-2 rounded-lg text-sm transition-all ${
                          details.tipoAbonoExtra === 'reducir_plazo' ? 'bg-turquoise text-white' : 'bg-gray-700/80 text-white hover:bg-gray-600'
                        }`}
                      >
                        Reducir Plazo
                      </button>
                      <button
                        onClick={() => handleDetailChange('tipoAbonoExtra', 'reducir_cuota')}
                        className={`px-4 py-2 rounded-lg text-sm transition-all ${
                          details.tipoAbonoExtra === 'reducir_cuota' ? 'bg-turquoise text-white' : 'bg-gray-700/80 text-white hover:bg-gray-600'
                        }`}
                      >
                        Reducir Cuota
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <button
          onClick={handleCalculate}
          className="w-full mt-4 py-4 bg-turquoise text-white font-semibold text-lg rounded-xl shadow-lg shadow-turquoise/30 hover:bg-opacity-90 transform hover:scale-[1.02] transition-all duration-200"
        >
          Calcular Prestamo
        </button>
      </div>

      {results && (
        <div className="mt-10">
          <ResultsDisplay
            results={results}
            details={details}
            title={'credito'}
            isPro={isPremium}
            onShowPaywall={onShowPaywall}
            creditType={creditType}
            creditTitle={config.title}
            onAddScenario={onAddScenario}
            scenarios={scenarios}
            onShowComparator={onShowComparator}
          />
        </div>
      )}
    </div>
  );
};

interface ResultsProps {
  results: CalculationResults;
  details: LoanDetails;
  title: string;
}

const ResultsDisplay = ({
  results,
  details,
  title,
  isPro,
  onShowPaywall,
  creditType,
  creditTitle,
  onAddScenario,
  scenarios,
  onShowComparator,
}: ResultsProps & {
  isPro: boolean;
  onShowPaywall: () => void;
  creditType: Exclude<CreditType, 'capacidad'>;
  creditTitle: string;
  onAddScenario: (s: ScenarioEntry) => void;
  scenarios: ScenarioEntry[];
  onShowComparator: () => void;
}) => {
  const [showTable, setShowTable] = useState(false);

  const tableData = results.nuevaTablaAmortizacion || results.tablaAmortizacion;

  const handleExportPdf = () => {
    if (!isPro) { onShowPaywall(); return; }
    generatePdf(results, details, title);
  };

  const handleExportExcel = () => {
    if (!isPro) { onShowPaywall(); return; }
    generateExcel(results, details, title);
  };

  const handleSaveScenario = () => {
    const scenarioNumber = scenarios.length + 1;
    const scenario: ScenarioEntry = {
      id: Date.now().toString(),
      label: `Escenario ${scenarioNumber}`,
      creditType,
      creditTitle,
      montoPrestamo: details.montoPrestamo,
      plazoAnios: details.plazoAnios,
      tasaInteresAnual: details.tasaInteresAnual,
      cuotaMensual: results.cuotaMensual,
      totalInteres: results.totalInteres,
      terminasPagando: results.terminasPagando,
    };
    onAddScenario(scenario);
  };

  const savingsMessage = (
    <div className="bg-green-900/50 text-green-300 p-4 rounded-lg text-center font-medium border border-green-700/50">
      Muy bien! Con tu cuota extraordinaria ahorras{' '}
      <strong>${formatCurrency(results.ahorroTotal ?? 0)}</strong>
      {results.mesesAhorrados && results.mesesAhorrados > 0 ? (
        <>
          {' '}y pagaras tu prestamo{' '}
          <strong>
            {results.mesesAhorrados}{' '}
            {results.mesesAhorrados === 1 ? 'mes' : 'meses'}
          </strong>{' '}
          mas rapido.
        </>
      ) : (
        '. Tu nueva cuota mas baja se reflejara en la tabla de amortizacion.'
      )}
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="px-5 md:px-7">
        <header className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Resumen de tu {title}
          </h2>
          <p className="text-gray-300 mt-2 text-sm md:text-base font-light">
            Estos son los resultados de tu simulacion.
          </p>
        </header>
      </div>

      <div className="bg-slate-800/40 border border-slate-700/60 p-5 md:p-7 rounded-2xl shadow-lg">
        <div className="text-center mb-7">
          <p className="text-gray-200 text-sm font-light mb-2">
            {results.nuevaCuotaMensual ? 'Tu cuota mensual inicial es de:' : 'Tu cuota mensual es de:'}
          </p>
          <p className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            ${formatCurrency(results.cuotaMensual)}
          </p>

          {results.nuevaCuotaMensual && (
            <>
              <p className="text-gray-200 mt-6 text-sm font-light mb-2">
                Tu nueva cuota mensual sera de:
              </p>
              <p className="text-3xl md:text-4xl font-bold text-turquoise">
                ${formatCurrency(results.nuevaCuotaMensual)}
              </p>
            </>
          )}
        </div>

        <div className="bg-slate-700/40 rounded-xl p-5 mb-7">
          <h3 className="text-base font-semibold text-turquoise mb-4 text-center tracking-wide">
            Detalle del Credito
          </h3>

          <div className="space-y-2.5">
            <div className="flex justify-between items-center py-2.5 border-b border-slate-600/50">
              <span className="text-gray-300 text-sm">Valor del Bien</span>
              <span className="text-white font-semibold text-sm">${formatCurrency(details.valorPropiedad)}</span>
            </div>

            <div className="flex justify-between items-center py-2.5 border-b border-slate-600/50">
              <span className="text-gray-300 text-sm">Tu Entrada</span>
              <span className="text-white font-semibold text-sm">${formatCurrency(details.valorPropiedad - details.montoPrestamo)}</span>
            </div>

            <div className="flex justify-between items-center py-2.5 border-b border-slate-600/50">
              <span className="text-gray-300 text-sm">Monto Solicitado</span>
              <span className="text-white font-semibold text-sm">${formatCurrency(details.montoPrestamo)}</span>
            </div>

            <div className="flex justify-between items-center py-2.5 border-b border-slate-600/50">
              <span className="text-gray-300 text-sm">Monto de Intereses</span>
              <span className="text-white font-semibold text-sm">${formatCurrency(results.totalInteres)}</span>
            </div>

            {results.gastosLegales && results.gastosLegales > 0 && (
              <div className="flex justify-between items-center py-2.5 border-b border-slate-600/50">
                <span className="text-gray-300 text-sm">Gastos Legales / Impuestos</span>
                <span className="text-white font-semibold text-sm">${formatCurrency(results.gastosLegales)}</span>
              </div>
            )}

            {results.seguroVehicular && results.seguroVehicular > 0 && (
              <>
                <div className="flex justify-between items-center py-2.5 border-b border-slate-600/50">
                  <span className="text-gray-300 text-sm">Seguro Vehicular (Anual)</span>
                  <span className="text-white font-semibold text-sm">${formatCurrency(results.seguroVehicular)}</span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-slate-600/50">
                  <span className="text-gray-300 text-sm">
                    Seguro Vehicular (Mensual){details.sumarSeguroACuota ? ' - incluido en cuota' : ''}
                  </span>
                  <span className="text-white font-semibold text-sm">${formatCurrency(results.seguroVehicular / 12)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="text-center mb-7 bg-gradient-to-r from-turquoise/20 to-blue-500/20 rounded-xl p-5 border border-turquoise/30">
          <p className="text-sm text-gray-200 mb-2 font-light">
            Terminas Pagando un Total de
          </p>
          <p className="text-3xl md:text-4xl font-bold text-turquoise">
            ${formatCurrency(results.terminasPagando)}
          </p>
        </div>

        {results.ahorroTotal && results.ahorroTotal > 0 && (
          <div className="mb-7">{savingsMessage}</div>
        )}

        <div className="pt-4 space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleSaveScenario}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-700/80 hover:bg-slate-600/80 border border-slate-600 text-white font-medium rounded-xl transition-all"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <span className="text-sm">Guardar escenario</span>
            </button>

            {scenarios.length >= 1 && (
              <button
                onClick={onShowComparator}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-turquoise/10 hover:bg-turquoise/20 border border-turquoise/40 font-medium rounded-xl transition-all"
                style={{ color: '#00B9AE' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-sm">Comparar ({scenarios.length})</span>
              </button>
            )}
          </div>

          <button
            onClick={() => setShowTable((prev) => !prev)}
            className="w-full py-3 bg-slate-700/80 text-white font-medium rounded-xl hover:bg-slate-600 transition-all shadow-sm"
          >
            {showTable ? 'Ocultar' : 'Ver'} Tabla de Amortizacion
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <button
              onClick={handleExportPdf}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-transparent border-2 font-medium rounded-xl transition-all shadow-sm"
              style={{
                borderColor: isPro ? '#27b9ab' : 'rgba(39,185,171,0.4)',
                color: isPro ? '#27b9ab' : 'rgba(39,185,171,0.5)',
              }}
            >
              {isPro ? (
                <DownloadIcon className="w-5 h-5" />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
              Exportar a PDF
            </button>

            <button
              onClick={handleExportExcel}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-transparent border-2 font-medium rounded-xl transition-all shadow-sm"
              style={{
                borderColor: isPro ? 'rgb(34,197,94)' : 'rgba(34,197,94,0.4)',
                color: isPro ? 'rgb(34,197,94)' : 'rgba(34,197,94,0.5)',
              }}
            >
              {isPro ? (
                <TableCellsIcon className="w-5 h-5" />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
              Exportar a Excel
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <DonutChart
          capital={details.montoPrestamo}
          intereses={results.totalInteres}
        />
      </div>

      {showTable && (
        <div className="bg-slate-800/40 border border-slate-700/60 p-4 md:p-6 rounded-2xl shadow-lg mt-5">
          <h3 className="text-xl font-bold text-white tracking-tight mb-4">
            Tabla de Amortizacion
          </h3>

          <div className="overflow-auto max-h-[60vh] rounded-lg border border-slate-700">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-gray-300 uppercase bg-slate-700 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-3 font-semibold">Mes</th>
                  <th className="px-3 py-3 font-semibold">Cuota</th>
                  <th className="px-3 py-3 font-semibold">Capital</th>
                  <th className="px-3 py-3 font-semibold">Interes</th>
                  {details.hacerAbonoExtra && tableData.some((r) => r.abonoExtra > 0) && (
                    <th className="px-3 py-3 font-semibold">Abono Extra</th>
                  )}
                  <th className="px-3 py-3 font-semibold text-right">Saldo</th>
                </tr>
              </thead>

              <tbody className="bg-slate-800">
                {tableData.map((row) => (
                  <tr key={row.periodo} className="border-b border-slate-700 last:border-b-0">
                    <td className="px-3 py-2 font-medium text-gray-200">{row.periodo}</td>
                    <td className="px-3 py-2">${formatCurrency(row.cuota)}</td>
                    <td className="px-3 py-2 text-green-400">${formatCurrency(row.capital)}</td>
                    <td className="px-3 py-2 text-red-400">${formatCurrency(row.interes)}</td>
                    {details.hacerAbonoExtra && tableData.some((r) => r.abonoExtra > 0) && (
                      <td className="px-3 py-2">${formatCurrency(row.abonoExtra)}</td>
                    )}
                    <td className="px-3 py-2 text-right font-semibold text-gray-200">${formatCurrency(row.saldoRestante)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 text-center text-lg font-bold text-green-400 flex items-center justify-center gap-3">
            <PartyPopperIcon className="w-7 h-7" />
            <span>FELICIDADES. TERMINASTE DE PAGAR TU CREDITO!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
