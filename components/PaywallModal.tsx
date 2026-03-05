import React, { useState } from 'react';
import { usePurchase } from '../context/PurchaseContext';

interface PaywallModalProps {
  onClose: () => void;
}

export const PaywallModal = ({ onClose }: PaywallModalProps) => {
  const { purchasePremium, restorePurchases } = usePurchase();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      await purchasePremium();
      onClose();
    } catch {
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await restorePurchases();
      onClose();
    } catch {
    } finally {
      setRestoring(false);
    }
  };

  const premiumFeatures = [
    'Simulador Hipotecario',
    'Simulador Vehicular',
    'Simulador Microcrédito',
    'Exportar a PDF',
    'Exportar a Excel',
    'Tabla de amortización completa',
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <div className="w-full max-w-sm bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl border border-slate-700/60 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="relative px-6 pt-8 pb-5 text-center bg-gradient-to-b from-[#00B9AE]/20 to-transparent">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-700/60 text-gray-400 hover:text-white hover:bg-slate-600 transition-all"
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#00B9AE]/20 border-2 border-[#00B9AE]/40 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#00B9AE" strokeWidth={1.8} className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-white tracking-tight">
            CrediCuotas <span style={{ color: '#00B9AE' }}>Pro</span>
          </h2>
          <p className="mt-1 text-sm text-gray-400 font-light">
            Desbloquea todas las funciones
          </p>
        </div>

        {/* Features list */}
        <div className="px-6 pb-5">
          <ul className="space-y-2.5 mb-6">
            {premiumFeatures.map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: '#00B9AE22', border: '1.5px solid #00B9AE66' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#00B9AE" strokeWidth={2.5} className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-gray-200">{feature}</span>
              </li>
            ))}
          </ul>

          {/* Free tier note */}
          <div className="mb-5 p-3 rounded-xl bg-slate-700/40 border border-slate-600/40">
            <p className="text-xs text-gray-400 text-center">
              La versión gratuita incluye el <span className="text-white font-medium">Crédito de Consumo</span> y el cálculo de la cuota mensual.
            </p>
          </div>

          {/* CTA button */}
          <button
            onClick={handlePurchase}
            disabled={purchasing}
            className="w-full py-4 rounded-2xl font-semibold text-white text-base transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
            style={{
              background: purchasing ? '#00B9AE88' : 'linear-gradient(135deg, #00B9AE, #00968C)',
              boxShadow: '0 8px 24px rgba(0,185,174,0.35)',
            }}
          >
            {purchasing ? 'Procesando...' : 'Obtener Premium'}
          </button>

          {/* Restore purchases */}
          <button
            onClick={handleRestore}
            disabled={restoring}
            className="w-full mt-3 py-2.5 text-sm text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            {restoring ? 'Restaurando...' : 'Restaurar compras anteriores'}
          </button>

          <p className="mt-2 text-xs text-gray-600 text-center">
            Pago único · Sin suscripciones
          </p>
        </div>
      </div>
    </div>
  );
};
