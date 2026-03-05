import React, { useState } from 'react';
import { usePurchase } from '../context/PurchaseContext';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal = ({ onClose }: SettingsModalProps) => {
  const { restorePurchases } = usePurchase();
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState('');

  const handleRestore = async () => {
    setRestoring(true);
    setRestoreMsg('');
    try {
      await restorePurchases();
      setRestoreMsg('Compras restauradas correctamente.');
    } catch {
      setRestoreMsg('No se encontraron compras anteriores.');
    } finally {
      setRestoring(false);
    }
  };

  const handleShare = async () => {
    const url = 'https://labappstudio.com/credicuotas#descargas';
    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title: 'CrediCuotas',
          text: 'Simula tus créditos con CrediCuotas',
          url,
          dialogTitle: 'Compartir CrediCuotas',
        });
      } catch {
        window.open(url, '_blank');
      }
    } else {
      if (navigator.share) {
        try {
          await navigator.share({ title: 'CrediCuotas', url });
        } catch {
        }
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent('Simula tus créditos con CrediCuotas: ' + url)}`, '_blank');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl border border-slate-700/60 shadow-2xl overflow-hidden mb-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-700/50">
          <h2 className="text-base font-semibold text-white">Configuración</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700/60 text-gray-400 hover:text-white hover:bg-slate-600 transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-3 space-y-1">

          <a
            href="https://labappstudio.com/politicas-de-seguridad"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full px-3 py-3.5 rounded-xl text-gray-300 hover:text-white hover:bg-slate-700/50 transition-all"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(0,185,174,0.12)', border: '1px solid rgba(0,185,174,0.25)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#00B9AE" strokeWidth={1.8} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-sm font-medium">Políticas de seguridad</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 ml-auto text-gray-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>

          <a
            href="https://labappstudio.com/credicuotas#politicasdeprivacidad"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full px-3 py-3.5 rounded-xl text-gray-300 hover:text-white hover:bg-slate-700/50 transition-all"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(0,185,174,0.12)', border: '1px solid rgba(0,185,174,0.25)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#00B9AE" strokeWidth={1.8} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-sm font-medium">Políticas de privacidad</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 ml-auto text-gray-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>

          <button
            onClick={handleShare}
            className="flex items-center gap-3 w-full px-3 py-3.5 rounded-xl text-gray-300 hover:text-white hover:bg-slate-700/50 transition-all text-left"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(0,185,174,0.12)', border: '1px solid rgba(0,185,174,0.25)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#00B9AE" strokeWidth={1.8} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <span className="text-sm font-medium">Compartir esta app</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 ml-auto text-gray-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={handleRestore}
            disabled={restoring}
            className="flex items-center gap-3 w-full px-3 py-3.5 rounded-xl text-gray-300 hover:text-white hover:bg-slate-700/50 transition-all text-left disabled:opacity-50"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(0,185,174,0.12)', border: '1px solid rgba(0,185,174,0.25)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#00B9AE" strokeWidth={1.8} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <span className="text-sm font-medium">{restoring ? 'Restaurando...' : 'Restaurar compras'}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 ml-auto text-gray-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {restoreMsg && (
            <p className="text-xs text-center px-3 py-2 text-gray-400">{restoreMsg}</p>
          )}
        </div>

        <div className="pb-6" />
      </div>
    </div>
  );
};
