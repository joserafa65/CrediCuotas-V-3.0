import React, { useEffect, useState } from 'react';

interface DonutChartProps {
  capital: number;
  intereses: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-ES', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

export const DonutChart = ({ capital, intereses }: DonutChartProps) => {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(t);
  }, [capital, intereses]);

  const total = capital + intereses;
  if (total <= 0) return null;

  const capitalPct = (capital / total) * 100;
  const interesesPct = (intereses / total) * 100;

  const r = 54;
  const cx = 70;
  const cy = 70;
  const circumference = 2 * Math.PI * r;

  const capitalDash = animated ? (capitalPct / 100) * circumference : 0;
  const interesesDash = animated ? (interesesPct / 100) * circumference : 0;

  const capitalOffset = 0;
  const interesesOffset = circumference - capitalDash;

  return (
    <div className="bg-slate-800/40 border border-slate-700/60 p-5 md:p-6 rounded-2xl shadow-lg">
      <h3 className="text-base font-semibold text-white mb-4 text-center">Distribucion del Credito</h3>

      <div className="flex flex-col sm:flex-row items-center gap-6">

        <div className="relative flex-shrink-0" style={{ width: 140, height: 140 }}>
          <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="rgba(71,85,105,0.4)"
              strokeWidth={16}
            />
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="#00B9AE"
              strokeWidth={16}
              strokeDasharray={circumference}
              strokeDashoffset={circumference - capitalDash}
              strokeLinecap="butt"
              style={{ transition: 'stroke-dashoffset 0.8s ease-out', transformOrigin: 'center' }}
            />
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="#F59E0B"
              strokeWidth={16}
              strokeDasharray={circumference}
              strokeDashoffset={circumference - interesesDash}
              strokeLinecap="butt"
              style={{
                transition: 'stroke-dashoffset 0.8s ease-out 0.1s',
                transform: `rotate(${(capitalPct / 100) * 360}deg)`,
                transformOrigin: `${cx}px ${cy}px`,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-xs text-gray-400 font-medium">Total</p>
            <p className="text-sm font-bold text-white leading-tight">${formatCurrency(total)}</p>
          </div>
        </div>

        <div className="flex-1 w-full space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#00B9AE', boxShadow: '0 0 6px rgba(0,185,174,0.6)' }} />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-300 font-medium">Capital</span>
                <span className="text-sm font-bold text-white">${formatCurrency(capital)}</span>
              </div>
              <div className="mt-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: animated ? `${capitalPct}%` : '0%', backgroundColor: '#00B9AE' }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{capitalPct.toFixed(1)}% del total</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#F59E0B', boxShadow: '0 0 6px rgba(245,158,11,0.6)' }} />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-300 font-medium">Intereses</span>
                <span className="text-sm font-bold text-white">${formatCurrency(intereses)}</span>
              </div>
              <div className="mt-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out delay-100"
                  style={{ width: animated ? `${interesesPct}%` : '0%', backgroundColor: '#F59E0B' }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{interesesPct.toFixed(1)}% del total</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
