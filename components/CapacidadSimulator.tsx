import React, { useState } from 'react';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-ES', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

interface CapacidadResults {
  montoMaximo: number;
  cuotaMaxima: number;
  tasaInteresAnual: number;
  plazoAnios: number;
  sensibilidad: { plazo: number; monto: number }[];
}

const calcMaxLoan = (cuota: number, tasaAnual: number, plazoAnios: number): number => {
  if (cuota <= 0 || tasaAnual <= 0 || plazoAnios <= 0) return 0;
  const r = tasaAnual / 100 / 12;
  const n = plazoAnios * 12;
  const monto = cuota * ((Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n)));
  return isFinite(monto) ? Math.round(monto) : 0;
};

const NumericInput = ({
  value, onChange, placeholder, allowDecimal = false, className,
}: {
  value: number; onChange: (v: number) => void; placeholder?: string; allowDecimal?: boolean; className?: string;
}) => {
  const [local, setLocal] = React.useState(value === 0 ? '' : String(value));
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    if (!focused) setLocal(value === 0 ? '' : String(value));
  }, [value, focused]);

  return (
    <input
      type="text"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      placeholder={placeholder ?? '0'}
      value={focused ? local : (value === 0 ? '' : String(value))}
      onFocus={() => { setFocused(true); setLocal(value === 0 ? '' : String(value)); }}
      onChange={(e) => {
        const raw = e.target.value.replace(allowDecimal ? /[^0-9.]/g : /[^0-9]/g, '');
        setLocal(raw);
        const num = parseFloat(raw);
        onChange(isNaN(num) ? 0 : num);
      }}
      onBlur={() => {
        setFocused(false);
        const num = parseFloat(local);
        const clean = isNaN(num) ? 0 : num;
        setLocal(clean === 0 ? '' : String(clean));
        onChange(clean);
      }}
      className={className}
    />
  );
};

export const CapacidadSimulator = () => {
  const [cuotaMax, setCuotaMax] = useState(500);
  const [tasa, setTasa] = useState(15.8);
  const [plazo, setPlazo] = useState(5);
  const [results, setResults] = useState<CapacidadResults | null>(null);

  const handleCalcular = () => {
    const montoMaximo = calcMaxLoan(cuotaMax, tasa, plazo);
    const sensibilidad = [1, 2, 3, 5, 7, 10, 15, 20].filter((p) => p <= 30).map((p) => ({
      plazo: p,
      monto: calcMaxLoan(cuotaMax, tasa, p),
    }));

    setResults({
      montoMaximo,
      cuotaMaxima: cuotaMax,
      tasaInteresAnual: tasa,
      plazoAnios: plazo,
      sensibilidad,
    });
  };

  return (
    <div>
      <header className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Capacidad de Pago
          </h2>
          <p className="text-gray-300 mt-2 text-sm md:text-base font-light">
            Descubre cuanto credito puedes solicitar segun tu presupuesto.
          </p>
          <p className="text-xs text-gray-500 mt-2.5 italic max-w-md leading-relaxed">
            El resultado es un estimado referencial basado en la formula de amortizacion estandar.
          </p>
        </div>
      </header>

      <div className="bg-slate-800/40 border border-slate-700/60 p-5 md:p-7 rounded-2xl shadow-lg">
        <div className="space-y-5 mb-7">

          <div>
            <label className="block font-semibold text-white text-sm mb-2">
              Cuota maxima mensual que puedes pagar
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
              <NumericInput
                value={cuotaMax}
                onChange={setCuotaMax}
                placeholder="500"
                className="w-full pl-8 p-3 bg-gray-700/80 border border-gray-600 rounded-lg focus:ring-2 focus:ring-turquoise focus:border-turquoise font-semibold text-white transition-all"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              Ingresa el monto maximo que puedes destinar mensualmente a una cuota de credito.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block font-semibold text-white text-sm mb-2">
                Plazo del credito
              </label>
              <select
                value={plazo}
                onChange={(e) => setPlazo(Number(e.target.value))}
                className="w-full p-3 bg-gray-700/80 border border-gray-600 rounded-lg focus:ring-2 focus:ring-turquoise focus:border-turquoise text-white transition-all"
              >
                {Array.from({ length: 30 }, (_, i) => i + 1).map((y) => (
                  <option key={y} value={y}>{y} {y === 1 ? 'año' : 'años'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-white text-sm mb-2">
                Tasa Nominal Anual (TNA)
              </label>
              <div className="relative">
                <NumericInput
                  value={tasa}
                  onChange={setTasa}
                  placeholder="15.8"
                  allowDecimal
                  className="w-full p-3 pr-8 bg-gray-700/80 border border-gray-600 rounded-lg focus:ring-2 focus:ring-turquoise focus:border-turquoise text-white transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">%</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleCalcular}
          className="w-full py-4 bg-turquoise text-white font-semibold text-lg rounded-xl shadow-lg shadow-turquoise/30 hover:bg-opacity-90 transform hover:scale-[1.02] transition-all duration-200"
        >
          Calcular Capacidad
        </button>
      </div>

      {results && (
        <div className="mt-8 space-y-5 animate-fade-in">

          <div className="bg-slate-800/40 border border-slate-700/60 p-5 md:p-7 rounded-2xl shadow-lg">
            <div className="text-center mb-6">
              <p className="text-gray-300 text-sm font-light mb-2">Con una cuota de ${formatCurrency(results.cuotaMaxima)}/mes puedes solicitar hasta:</p>
              <p className="text-4xl md:text-5xl font-bold text-turquoise tracking-tight">
                ${formatCurrency(results.montoMaximo)}
              </p>
              <p className="text-xs text-gray-500 mt-2">a {results.plazoAnios} años con una TNA del {results.tasaInteresAnual}%</p>
            </div>

            <div className="bg-slate-700/40 rounded-xl p-4 space-y-2.5">
              <h3 className="text-sm font-semibold text-turquoise mb-3 text-center tracking-wide">Como se calcula</h3>
              <div className="flex justify-between items-center py-2 border-b border-slate-600/50">
                <span className="text-gray-300 text-sm">Cuota maxima mensual</span>
                <span className="text-white font-semibold text-sm">${formatCurrency(results.cuotaMaxima)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-600/50">
                <span className="text-gray-300 text-sm">Tasa mensual</span>
                <span className="text-white font-semibold text-sm">{(results.tasaInteresAnual / 12).toFixed(4)}%</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-600/50">
                <span className="text-gray-300 text-sm">Numero de cuotas</span>
                <span className="text-white font-semibold text-sm">{results.plazoAnios * 12} meses</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-300 text-sm font-semibold">Monto maximo a solicitar</span>
                <span className="font-bold text-sm" style={{ color: '#00B9AE' }}>${formatCurrency(results.montoMaximo)}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/60 p-5 md:p-6 rounded-2xl shadow-lg">
            <h3 className="text-base font-semibold text-white mb-1">Tabla de Sensibilidad</h3>
            <p className="text-xs text-gray-400 mb-4">Monto maximo segun diferentes plazos con la misma cuota y tasa</p>

            <div className="overflow-hidden rounded-xl border border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-700 text-gray-300 text-xs uppercase">
                    <th className="px-4 py-3 text-left font-semibold">Plazo</th>
                    <th className="px-4 py-3 text-right font-semibold">Monto Maximo</th>
                    <th className="px-4 py-3 text-right font-semibold">vs. actual</th>
                  </tr>
                </thead>
                <tbody className="bg-slate-800 divide-y divide-slate-700">
                  {results.sensibilidad.map((row) => {
                    const diff = row.monto - results.montoMaximo;
                    const isSelected = row.plazo === results.plazoAnios;
                    return (
                      <tr
                        key={row.plazo}
                        className={`transition-colors ${isSelected ? 'bg-turquoise/10' : 'hover:bg-slate-700/30'}`}
                      >
                        <td className="px-4 py-3">
                          <span className={`font-medium ${isSelected ? 'text-turquoise' : 'text-gray-200'}`}>
                            {row.plazo} {row.plazo === 1 ? 'año' : 'años'}
                            {isSelected && <span className="ml-1.5 text-xs bg-turquoise/20 text-turquoise px-1.5 py-0.5 rounded-full">seleccionado</span>}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold ${isSelected ? 'text-turquoise' : 'text-white'}`}>
                          ${formatCurrency(row.monto)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isSelected ? (
                            <span className="text-gray-500 text-xs">—</span>
                          ) : (
                            <span className={`text-xs font-medium ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {diff > 0 ? '+' : ''}${formatCurrency(diff)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-gray-500 mt-3 text-center italic">
              A mayor plazo, mayor monto posible con la misma cuota mensual.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
