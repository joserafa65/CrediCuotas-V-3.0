import React, { useState, useMemo, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  LoanDetails,
  CalculationResults,
  FrecuenciaAbono,
  CreditType
} from './types';
import { calculateLoan } from './services/loanCalculator';
import { generatePdf } from './services/pdfGenerator';
import { generateExcel } from './services/excelGenerator';
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

type Screen = 'menu' | 'simulator';

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
  CreditType,
  {
    title: string;
    Icon: React.ComponentType<{ className?: string }>;
    propertyLabel: string;
    defaultDetails: LoanDetails;
  }
> = {
  hipotecario: {
    title: 'Crédito Hipotecario',
    Icon: BuildingsIcon,
    propertyLabel: '¿Cuánto vale mi nueva propiedad?',
    defaultDetails: {
      ...baseLoanDetails,
      valorPropiedad: 150000,
      montoPrestamo: 120000,
      plazoAnios: 20,
      tasaInteresAnual: 9.5
    }
  },
  vehicular: {
    title: 'Crédito Vehicular',
    Icon: CarIcon,
    propertyLabel: '¿Cuánto vale el vehículo?',
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
    title: 'Microcrédito',
    Icon: TractorIcon,
    propertyLabel: '¿Cuál es el valor del activo?',
    defaultDetails: {
      ...baseLoanDetails,
      valorPropiedad: 10000,
      montoPrestamo: 8000,
      plazoAnios: 3,
      tasaInteresAnual: 20.5
    }
  },
  consumo: {
    title: 'Crédito de Consumo',
    Icon: ShoppingCartIcon,
    propertyLabel: '¿Cuál es el monto del crédito?',
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
const PREMIUM_CREDIT_TYPES: CreditType[] = ['hipotecario', 'vehicular', 'microcredito'];

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
  const [showSplash, setShowSplash] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [screen, setScreen] = useState<Screen>('menu');
  const [simulationToLoad, setSimulationToLoad] = useState<{
    details: LoanDetails;
    type: CreditType;
  } | null>(null);

  // Título que se pasa a ResultsDisplay
  const title = 'crédito';

  // Onboarding: solo la primera vez, usando clave _v2
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding_v2');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);
  // Splash de inicio (2 segundos)
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

  // Splash screen
  if (showSplash) {
    return (
      <div
        onClick={handleSplashClick}
        className={`fixed inset-0 w-full h-full flex items-center justify-center cursor-pointer z-50 ${
          fadeOut ? 'splash-fadeOut' : 'splash-fadeIn'
        }`}
        style={{
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        <img
          src="/logocredicuotaspantallainicio_02.webp"
          alt="CrediCuotas"
          className="w-full h-full object-cover"
          style={{
            maxWidth: '100%',
            maxHeight: '100%'
          }}
        />
      </div>
    );
  }

  // Onboarding (pantallas iniciales)
  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // App principal
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
          />
        )}
        {screen === 'simulator' && simulationToLoad && (
          <Simulator
            onBack={backToMenu}
            creditType={simulationToLoad.type}
            initialDetails={simulationToLoad.details}
            isPremium={isPremium}
            onShowPaywall={() => setShowPaywall(true)}
          />
        )}
      </main>

      <footer className="fixed bottom-0 left-0 w-full h-[100px] z-50 bg-transparent pointer-events-none">
        <div id="bottom-ad" className="pointer-events-auto"></div>
      </footer>

      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
};

const MainMenu = ({
  onStart,
  isPremium,
  onShowPaywall,
  onShowSettings,
}: {
  onStart: (type: CreditType) => void;
  isPremium: boolean;
  onShowPaywall: () => void;
  onShowSettings: () => void;
}) => {
  const customIcons: Record<CreditType, string> = {
    hipotecario: "/icons/Hipotecario.svg",
    vehicular: "/icons/Vehicular.svg",
    microcredito: "/icons/Microcredito.svg",
    consumo: "/icons/Consumo.svg"
  };

  return (
    <div className="flex flex-col items-center text-center min-h-[calc(100vh-7rem)] sm:min-h-[calc(100vh-8rem)]">
      <div className="pt-8 md:pt-12 w-full">

        {/* LOGO SUPERIOR */}
        <div className="flex justify-center mb-3">
          <img
            src="/logo_credicuotas_baner_arriba_02.png"
            alt="CrediCuotas"
            className="h-14 sm:h-16 md:h-20 w-auto object-contain max-w-full px-4"
          />
        </div>

        <p className="mt-3 text-base md:text-lg text-gray-400 font-light">
          Simulador universal para tus créditos
        </p>

        {/* BOTONES DE CRÉDITO */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mx-auto">

          {(Object.keys(creditTypeConfig) as CreditType[]).map((type) => {
            const { title } = creditTypeConfig[type];
            const iconPath = customIcons[type];
            const isPremiumType = PREMIUM_CREDIT_TYPES.includes(type);
            const locked = isPremiumType && !isPremium;

            return (
              <button
                key={type}
                onClick={() => onStart(type)}
                className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900
                           border-2 rounded-2xl p-4 transition-all duration-300
                           hover:shadow-2xl hover:-translate-y-1"
                style={{
                  borderColor: locked ? 'rgba(156,163,175,0.2)' : 'rgba(0,185,174,0.3)',
                }}
              >
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-turquoise/0 to-turquoise/0
                                group-hover:from-turquoise/10 group-hover:to-turquoise/5 transition-all duration-300" />

                {/* Lock badge */}
                {locked && (
                  <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'transparent', border: '2px solid #F59E0B', boxShadow: '0 0 8px rgba(245,158,11,0.6)' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5 text-amber-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                )}

                {/* CONTENIDO */}
                <div className="relative flex flex-col items-center gap-3">

                  {/* ÍCONO PERSONALIZADO */}
                  <div
                    className="w-12 h-12 flex items-center justify-center rounded-full overflow-hidden
                               transition-all duration-300 group-active:scale-110"
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

                  {/* TÍTULO */}
                  <span
                    className="text-lg font-bold transition-colors duration-300"
                    style={{ color: locked ? 'rgba(156,163,175,0.7)' : 'white' }}
                  >
                    {title}
                  </span>

                  {locked && (
                    <span className="text-xs text-gray-500 font-medium -mt-1">Simulador avanzado<br />Disponible en Premium</span>
                  )}
                </div>
              </button>
            );
          })}

        </div>

        {/* Premium CTA banner for free users */}
        {!isPremium && (
          <div className="mt-6 max-w-2xl mx-auto">
            <button
              onClick={onShowPaywall}
              className="w-full py-3 px-5 rounded-2xl border border-amber-400/40 bg-transparent hover:bg-amber-400/5 transition-all duration-200 flex items-center justify-between gap-3"
              style={{ boxShadow: '0 0 12px rgba(245,158,11,0.15)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'transparent', border: '2px solid #F59E0B', boxShadow: '0 0 8px rgba(245,158,11,0.4)' }}>
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
      </div>

      {/* DISCLAIMER INFERIOR */}
      <div className="mt-auto pt-10 pb-4 w-full">
        <div className="max-w-2xl mx-auto text-xs text-gray-500 text-center space-y-2 leading-relaxed">
          <p>
            Las tasas de interés y los resultados presentados en este simulador
            son referenciales y aproximados, calculados con base en los rangos
            establecidos por el Banco Central del Ecuador (BCE) para cada uno de los segmentos.
          </p>
          <p>
            Los valores finales pueden variar según el perfil crediticio del solicitante,
            políticas internas de cada institución financiera, y costos adicionales.
          </p>
          <p>
            El resultado no constituye una oferta vinculante ni un compromiso de crédito.
          </p>
        </div>

        <div className="flex justify-center mt-5">
          <button
            onClick={onShowSettings}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-slate-800/60 transition-all border-2"
            style={{ borderColor: 'rgba(0,185,174,0.3)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs">Configuración</span>
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
}: {
  onBack: () => void;
  initialDetails: Partial<LoanDetails>;
  creditType: CreditType;
  isPremium: boolean;
  onShowPaywall: () => void;
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
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  useEffect(() => {
    const defaultDetails = { ...baseLoanDetails, ...config.defaultDetails, ...initialDetails };
    setDetails(defaultDetails);
    const e = defaultDetails.valorPropiedad - defaultDetails.montoPrestamo;
    setPorcentajeEntrada(defaultDetails.valorPropiedad > 0 ? e / defaultDetails.valorPropiedad : 0);
    setResults(null);
  }, [initialDetails, creditType]);

  const entrada = useMemo(
    () => details.valorPropiedad - details.montoPrestamo,
    [details.valorPropiedad, details.montoPrestamo]
  );

  const porcentajeEntradaDisplay = useMemo(
    () =>
      details.valorPropiedad > 0
        ? (entrada / details.valorPropiedad) * 100
        : 0,
    [entrada, details.valorPropiedad]
  );

  const minEntradaWarning = useMemo(() => {
    if (creditType === 'hipotecario' && details.valorPropiedad > 0) {
      const pct = (entrada / details.valorPropiedad) * 100;
      if (pct < 20) return 'Los bancos suelen requerir una entrada mínima de 20% para este tipo de crédito.';
    }
    if (creditType === 'vehicular' && details.valorPropiedad > 0) {
      const pct = (entrada / details.valorPropiedad) * 100;
      if (pct < 15) return 'Los bancos suelen requerir una entrada mínima de 15% para este tipo de crédito.';
    }
    if (creditType === 'microcredito' && details.valorPropiedad > 0) {
      const pct = (entrada / details.valorPropiedad) * 100;
      if (pct < 10) return 'Muchos microcréditos solicitan una garantía o respaldo cercano al 10% del monto solicitado.';
    }
    return null;
  }, [creditType, entrada, details.valorPropiedad]);

  const handleDetailChange = (field: keyof LoanDetails, value: any) => {
    setDetails((prev) => ({ ...prev, [field]: value }));
  };

  const handleValorPropiedadChange = (value: number) => {
    if (creditType === 'consumo') {
      setDetails((prev) => ({
        ...prev,
        valorPropiedad: value,
        montoPrestamo: value
      }));
      return;
    }

    const newEntrada = value * porcentajeEntrada;
    const clampedEntrada = Math.min(newEntrada, value);
    const newMontoPrestamo = value - clampedEntrada;
    setDetails((prev) => ({
      ...prev,
      valorPropiedad: value,
      montoPrestamo: Math.max(0, newMontoPrestamo)
    }));
  };

  const handleEntradaChange = (value: number) => {
    if (details.valorPropiedad === 0) return;
    const clampedEntrada = Math.min(value, details.valorPropiedad);
    const newMontoPrestamo = details.valorPropiedad - clampedEntrada;
    setPorcentajeEntrada(clampedEntrada / details.valorPropiedad);
    setDetails((prev) => ({
      ...prev,
      montoPrestamo: Math.max(0, newMontoPrestamo)
    }));
  };

  const handleCalculate = () => {
    const calculatedResults = calculateLoan(details);
    setResults(calculatedResults);
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 bg-turquoise/90 text-white font-medium px-5 py-2.5 rounded-full hover:bg-turquoise transition-colors mb-6 shadow-md"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Volver al menú
      </button>

<header className="flex justify-between items-start mb-6">
  <div>
    <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
      Simulador de {config.title}
    </h2>
    <p className="text-gray-300 mt-2 text-sm md:text-base font-light">
      Ingresa los datos para simular tu crédito.
    </p>
    <p className="text-xs text-gray-500 mt-2.5 italic max-w-md leading-relaxed">
      Los resultados obtenidos son un ejercicio estimativo y pueden variar
      según la entidad financiera, el perfil del solicitante, y las
      condiciones específicas del crédito.
    </p>
  </div>
</header>

      <div className="bg-slate-800/40 border border-slate-700/60 p-5 md:p-7 rounded-2xl shadow-lg">
        <div className="space-y-5 mb-7">
          <div>
            <label className="block font-semibold text-white text-sm mb-2">
              {config.propertyLabel}
            </label>
            <input
              type="text"
              value={`$ ${formatCurrency(details.valorPropiedad)}`}
              onChange={(e) =>
                handleValorPropiedadChange(
                  Number(e.target.value.replace(/[^0-9]/g, ''))
                )
              }
              className="w-full p-3 bg-gray-700/80 border border-gray-600 rounded-lg focus:ring-2 focus:ring-turquoise focus:border-turquoise font-semibold text-white transition-all"
            />
          </div>

          {creditType !== 'consumo' && (
            <>
              <div>
                <label className="block font-semibold text-white text-sm mb-2">
                  {creditType === 'microcredito' ? '¿De cuánto es la garantía?' : '¿De cuánto es la entrada?'}
                </label>
                <input
                  type="text"
                  value={`$ ${formatCurrency(entrada)}`}
                  onChange={(e) =>
                    handleEntradaChange(
                      Number(e.target.value.replace(/[^0-9]/g, ''))
                    )
                  }
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
                    ¿Cuánto necesito?
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`$ ${formatCurrency(details.montoPrestamo)}`}
                    className="w-full p-3 bg-slate-800/40 border border-slate-600/40 rounded-lg font-semibold text-gray-300 cursor-default"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-white text-sm mb-2">
                    {creditType === 'microcredito' ? '% de garantía' : '% de entrada'}
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`${porcentajeEntradaDisplay.toFixed(1)}%`}
                    className="w-full p-3 bg-slate-800/40 border border-slate-600/40 rounded-lg font-semibold text-gray-300 cursor-default"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 italic -mt-2">
                Los valores se calculan automáticamente según el valor del activo y la entrada.
              </p>
            </>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-5 mb-2">
          <div>
            <label
              htmlFor="plazo"
              className="block font-semibold text-white text-sm mb-2"
            >
              ¿En cuánto tiempo deseo pagar?
            </label>
            <select
              id="plazo"
              value={details.plazoAnios}
              onChange={(e) =>
                handleDetailChange('plazoAnios', Number(e.target.value))
              }
              className="w-full p-3 bg-gray-700/80 border border-gray-600 rounded-lg focus:ring-2 focus:ring-turquoise focus:border-turquoise text-white transition-all"
            >
              {Array.from(
                { length: creditType === 'hipotecario' ? 28 : 8 },
                (_, i) => i + (creditType === 'hipotecario' ? 3 : 1)
              ).map((y) => (
                <option key={y} value={y}>
                  {y} años
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="tasa"
              className="block font-semibold text-white text-sm mb-2"
            >
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
          Este % es referencial. Puedes cambiarla si la entidad te ha
          proporcionado una Tasa Nominal Anual (TNA).
        </p>

        <button
          onClick={() =>
            setShowAdvancedOptions((prevShow) => !prevShow)
          }
          className="w-full mb-7 py-3 bg-slate-700/80 text-white font-medium rounded-xl hover:bg-slate-600 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          {showAdvancedOptions
            ? '▼ Ocultar opciones avanzadas'
            : '▶ Más opciones'}
        </button>

        {showAdvancedOptions && (
          <>
            <div className="mb-5">
              <p className="font-semibold text-white text-sm mb-2.5">
                ¿Deseas que sumemos seguro de desgravamen?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    handleDetailChange('incluirSeguroDesgravamen', true)
                  }
                  className={`px-5 py-2 rounded-lg transition-all text-sm ${
                    details.incluirSeguroDesgravamen
                      ? 'bg-turquoise text-white'
                      : 'bg-gray-700/80 text-white hover:bg-gray-600'
                  }`}
                >
                  Sí
                </button>
                <button
                  onClick={() =>
                    handleDetailChange('incluirSeguroDesgravamen', false)
                  }
                  className={`px-5 py-2 rounded-lg transition-all text-sm ${
                    !details.incluirSeguroDesgravamen
                      ? 'bg-turquoise text-white'
                      : 'bg-gray-700/80 text-white hover:bg-gray-600'
                  }`}
                >
                  No
                </button>
              </div>
              {details.incluirSeguroDesgravamen && (
                <p className="text-xs text-gray-400 mt-2 px-1 leading-relaxed">
                  Se sumará un 0,04% del monto del préstamo a cada cuota
                  mensual.
                </p>
              )}
            </div>

            {creditType === 'vehicular' && (
              <div className="mb-5">
                <p className="font-semibold text-white text-sm mb-2.5">
                  ¿Deseas tener un estimado de cuánto costará el seguro para tu
                  vehículo?
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex gap-3">
                    <button
                      onClick={() =>
                        handleDetailChange('calcularSeguroVehicular', true)
                      }
                      className={`px-5 py-2 rounded-lg transition-all text-sm ${
                        details.calcularSeguroVehicular
                          ? 'bg-turquoise text-white'
                          : 'bg-gray-700/80 text-white hover:bg-gray-600'
                      }`}
                    >
                      Sí
                    </button>
                    <button
                      onClick={() =>
                        handleDetailChange('calcularSeguroVehicular', false)
                      }
                      className={`px-5 py-2 rounded-lg transition-all text-sm ${
                        !details.calcularSeguroVehicular
                          ? 'bg-turquoise text-white'
                          : 'bg-gray-700/80 text-white hover:bg-gray-600'
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
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        %
                      </span>
                    </div>
                  )}
                </div>
                {details.calcularSeguroVehicular && (
                  <>
                    <p className="text-xs text-gray-400 mt-2 px-1 leading-relaxed">
                      Este cálculo es referencial entre el 3% y el 7% según el
                      valor de tu vehículo y tu perfil personal.
                    </p>
                    <div className="mt-3 flex items-center gap-3 bg-slate-900/50 p-2.5 rounded-lg border border-slate-700/50">
                      <input
                        type="checkbox"
                        id="sumar-seguro-cuota"
                        checked={details.sumarSeguroACuota}
                        onChange={(e) =>
                          handleDetailChange(
                            'sumarSeguroACuota',
                            e.target.checked
                          )
                        }
                        className="h-5 w-5 rounded border-gray-500 bg-gray-700 text-turquoise focus:ring-turquoise focus:ring-offset-slate-800"
                      />
                      <label
                        htmlFor="sumar-seguro-cuota"
                        className="text-sm font-medium text-gray-200 cursor-pointer select-none"
                      >
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
                  ? '¿Deseas sumar un valor extra por trámites legales, impuestos o matriculación?'
                  : '¿Deseas sumar un valor extra por tramites legales o impuestos especiales?'}
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex gap-3">
                  <button
                    onClick={() =>
                      handleDetailChange('sumarGastosLegales', true)
                    }
                    className={`px-5 py-2 rounded-lg transition-all text-sm ${
                      details.sumarGastosLegales
                        ? 'bg-turquoise text-white'
                        : 'bg-gray-700/80 text-white hover:bg-gray-600'
                    }`}
                  >
                    Sí
                  </button>
                  <button
                    onClick={() =>
                      handleDetailChange('sumarGastosLegales', false)
                    }
                    className={`px-5 py-2 rounded-lg transition-all text-sm ${
                      !details.sumarGastosLegales
                        ? 'bg-turquoise text-white'
                        : 'bg-gray-700/80 text-white hover:bg-gray-600'
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
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      %
                    </span>
                  </div>
                )}
              </div>
              {details.sumarGastosLegales && (
                <p className="text-xs text-gray-400 mt-2 px-1 leading-relaxed">
                  {creditType === 'vehicular'
                    ? 'Recomendado: 5%. Se calculará este porcentaje del monto del préstamo como un valor por gastos por ejemplo la matriculación. Este valor es un pago único que se suma al total que terminas pagando.'
                    : `Recomendado: 1.5%. Se calculará este porcentaje del monto del préstamo como un valor por gastos.${
                        details.financiarGastosLegales
                          ? ' Este valor se sumará al capital del préstamo y afectará tus cuotas.'
                          : ' Este valor es un pago único que se suma al total que terminas pagando.'
                      }`}
                </p>
              )}
              {details.sumarGastosLegales && (
                <div className="mt-3 flex items-center gap-3 bg-slate-900/50 p-2.5 rounded-lg border border-slate-700/50">
                  <input
                    type="checkbox"
                    id="financiar-gastos"
                    checked={details.financiarGastosLegales}
                    onChange={(e) =>
                      handleDetailChange(
                        'financiarGastosLegales',
                        e.target.checked
                      )
                    }
                    className="h-5 w-5 rounded border-gray-500 bg-gray-700 text-turquoise focus:ring-turquoise focus:ring-offset-slate-800"
                  />
                  <label
                    htmlFor="financiar-gastos"
                    className="text-sm font-medium text-gray-200 cursor-pointer select-none"
                  >
                    ¿Deseas sumar el valor al préstamo?
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
                  onClick={() =>
                    handleDetailChange('hacerAbonoExtra', true)
                  }
                  className={`px-5 py-2 rounded-lg transition-all text-sm ${
                    details.hacerAbonoExtra
                      ? 'bg-turquoise text-white'
                      : 'bg-gray-700/80 text-white hover:bg-gray-600'
                  }`}
                >
                  Sí
                </button>
                <button
                  onClick={() =>
                    handleDetailChange('hacerAbonoExtra', false)
                  }
                  className={`px-5 py-2 rounded-lg transition-all text-sm ${
                    !details.hacerAbonoExtra
                      ? 'bg-turquoise text-white'
                      : 'bg-gray-700/80 text-white hover:bg-gray-600'
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
                        onChange={(e) =>
                          handleDetailChange(
                            'frecuenciaAbonoExtra',
                            e.target.value as FrecuenciaAbono
                          )
                        }
                        className="w-full p-2.5 bg-gray-700/80 border border-gray-600 rounded-lg focus:ring-2 focus:ring-turquoise focus:border-turquoise text-white text-sm"
                      >
                        {(
                          [
                            'Una vez',
                            'Mensual',
                            'Trimestral',
                            'Semestral',
                            'Anual'
                          ] as FrecuenciaAbono[]
                        ).map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
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
                        onClick={() =>
                          handleDetailChange(
                            'tipoAbonoExtra',
                            'reducir_plazo'
                          )
                        }
                        className={`px-4 py-2 rounded-lg text-sm transition-all ${
                          details.tipoAbonoExtra === 'reducir_plazo'
                            ? 'bg-turquoise text-white'
                            : 'bg-gray-700/80 text-white hover:bg-gray-600'
                        }`}
                      >
                        Reducir Plazo
                      </button>
                      <button
                        onClick={() =>
                          handleDetailChange(
                            'tipoAbonoExtra',
                            'reducir_cuota'
                          )
                        }
                        className={`px-4 py-2 rounded-lg text-sm transition-all ${
                          details.tipoAbonoExtra === 'reducir_cuota'
                            ? 'bg-turquoise text-white'
                            : 'bg-gray-700/80 text-white hover:bg-gray-600'
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
          Calcular Préstamo
        </button>
      </div>

      {results && (
        <div className="mt-10">
          <ResultsDisplay
            results={results}
            details={details}
            title={'crédito'}
            isPro={isPremium}
            onShowPaywall={onShowPaywall}
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
}: ResultsProps & { isPro: boolean; onShowPaywall: () => void }) => {
  const [showTable, setShowTable] = useState(false);

  const tableData =
    results.nuevaTablaAmortizacion || results.tablaAmortizacion;

  const handleExportPdf = () => {
    generatePdf(results, details, title);
  };

  const handleExportExcel = () => {
    generateExcel(results, details, title);
  };

  const savingsMessage = (
    <div className="bg-green-900/50 text-green-300 p-4 rounded-lg text-center font-medium border border-green-700/50">
      ¡Muy bien! Con tu cuota extraordinaria ahorras{' '}
      <strong>${formatCurrency(results.ahorroTotal ?? 0)}</strong>
      {results.mesesAhorrados && results.mesesAhorrados > 0 ? (
        <>
          {' '}
          y pagarás tu préstamo{' '}
          <strong>
            {results.mesesAhorrados}{' '}
            {results.mesesAhorrados === 1 ? 'mes' : 'meses'}
          </strong>{' '}
          más rápido.
        </>
      ) : (
        '. Tu nueva cuota más baja se reflejará en la tabla de amortización.'
      )}
    </div>
  );

  return (
    <div className="animate-fade-in">
      <header className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          Resumen de tu {title}
        </h2>
        <p className="text-gray-300 mt-2 text-sm md:text-base font-light">
          Estos son los resultados de tu simulación.
        </p>
      </header>

      <div className="bg-slate-800/40 border border-slate-700/60 p-5 md:p-7 rounded-2xl shadow-lg">
        <div className="text-center mb-7">
          <p className="text-gray-200 text-sm font-light mb-2">
            {results.nuevaCuotaMensual
              ? 'Tu cuota mensual inicial es de:'
              : 'Tu cuota mensual es de:'}
          </p>
          <p className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            ${formatCurrency(results.cuotaMensual)}
          </p>

          {results.nuevaCuotaMensual && (
            <>
              <p className="text-gray-200 mt-6 text-sm font-light mb-2">
                Tu nueva cuota mensual será de:
              </p>
              <p className="text-3xl md:text-4xl font-bold text-turquoise">
                ${formatCurrency(results.nuevaCuotaMensual)}
              </p>
            </>
          )}
        </div>

        <div className="bg-slate-700/40 rounded-xl p-5 mb-7">
          <h3 className="text-base font-semibold text-turquoise mb-4 text-center tracking-wide">
            Detalle del Crédito
          </h3>

          <div className="space-y-2.5">
            <div className="flex justify-between items-center py-2.5 border-b border-slate-600/50">
              <span className="text-gray-300 text-sm">Valor del Bien</span>
              <span className="text-white font-semibold text-sm">
                ${formatCurrency(details.valorPropiedad)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2.5 border-b border-slate-600/50">
              <span className="text-gray-300 text-sm">Tu Entrada</span>
              <span className="text-white font-semibold text-sm">
                $
                {formatCurrency(
                  details.valorPropiedad - details.montoPrestamo
                )}
              </span>
            </div>

            <div className="flex justify-between items-center py-2.5 border-b border-slate-600/50">
              <span className="text-gray-300 text-sm">Monto Solicitado</span>
              <span className="text-white font-semibold text-sm">
                ${formatCurrency(details.montoPrestamo)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2.5 border-b border-slate-600/50">
              <span className="text-gray-300 text-sm">Monto de Intereses</span>
              <span className="text-white font-semibold text-sm">
                ${formatCurrency(results.totalInteres)}
              </span>
            </div>

            {results.gastosLegales && results.gastosLegales > 0 && (
              <div className="flex justify-between items-center py-2.5 border-b border-slate-600/50">
                <span className="text-gray-300 text-sm">
                  Gastos Legales / Impuestos
                </span>
                <span className="text-white font-semibold text-sm">
                  ${formatCurrency(results.gastosLegales)}
                </span>
              </div>
            )}

            {results.seguroVehicular && results.seguroVehicular > 0 && (
              <>
                <div className="flex justify-between items-center py-2.5 border-b border-slate-600/50">
                  <span className="text-gray-300 text-sm">
                    Seguro Vehicular (Anual)
                  </span>
                  <span className="text-white font-semibold text-sm">
                    ${formatCurrency(results.seguroVehicular)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2.5 border-b border-slate-600/50">
                  <span className="text-gray-300 text-sm">
                    Seguro Vehicular (Mensual)
                    {details.sumarSeguroACuota
                      ? ' - incluido en cuota'
                      : ''}
                  </span>
                  <span className="text-white font-semibold text-sm">
                    ${formatCurrency(results.seguroVehicular / 12)}
                  </span>
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
          <button
            onClick={() => setShowTable((prev) => !prev)}
            className="w-full py-3 bg-slate-700/80 text-white font-medium rounded-xl hover:bg-slate-600 transition-all shadow-sm"
          >
            {showTable ? 'Ocultar' : 'Ver'} Tabla de Amortización
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

      {showTable && (
        <div className="bg-slate-800/40 border border-slate-700/60 p-4 md:p-6 rounded-2xl shadow-lg mt-7">
          <h3 className="text-xl font-bold text-white tracking-tight mb-4">
            Tabla de Amortización
          </h3>

          <div className="overflow-auto max-h-[60vh] rounded-lg border border-slate-700">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-gray-300 uppercase bg-slate-700 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-3 font-semibold">Mes</th>
                  <th className="px-3 py-3 font-semibold">Cuota</th>
                  <th className="px-3 py-3 font-semibold">Capital</th>
                  <th className="px-3 py-3 font-semibold">Interés</th>
                  {details.hacerAbonoExtra &&
                    tableData.some((r) => r.abonoExtra > 0) && (
                      <th className="px-3 py-3 font-semibold">
                        Abono Extra
                      </th>
                    )}
                  <th className="px-3 py-3 font-semibold text-right">
                    Saldo
                  </th>
                </tr>
              </thead>

              <tbody className="bg-slate-800">
                {tableData.map((row) => (
                  <tr
                    key={row.periodo}
                    className="border-b border-slate-700 last:border-b-0"
                  >
                    <td className="px-3 py-2 font-medium text-gray-200">
                      {row.periodo}
                    </td>
                    <td className="px-3 py-2">
                      ${formatCurrency(row.cuota)}
                    </td>
                    <td className="px-3 py-2 text-green-400">
                      ${formatCurrency(row.capital)}
                    </td>
                    <td className="px-3 py-2 text-red-400">
                      ${formatCurrency(row.interes)}
                    </td>
                    {details.hacerAbonoExtra &&
                      tableData.some((r) => r.abonoExtra > 0) && (
                        <td className="px-3 py-2">
                          ${formatCurrency(row.abonoExtra)}
                        </td>
                      )}
                    <td className="px-3 py-2 text-right font-semibold text-gray-200">
                      ${formatCurrency(row.saldoRestante)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 text-center text-lg font-bold text-green-400 flex items-center justify-center gap-3">
            <PartyPopperIcon className="w-7 h-7" />
            <span>¡FELICIDADES. TERMINASTE DE PAGAR TU CRÉDITO!</span>
          </div>
        </div>
      )}
    </div>
  );
};
export default App;



