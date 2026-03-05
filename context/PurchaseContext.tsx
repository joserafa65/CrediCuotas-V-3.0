import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

const REVENUECAT_API_KEY_IOS = 'appl_REPLACE_WITH_YOUR_IOS_KEY';
const REVENUECAT_API_KEY_ANDROID = 'goog_REPLACE_WITH_YOUR_ANDROID_KEY';
const ENTITLEMENT_ID = 'premium';
const PRODUCT_ID = 'premium_unlock';

interface PurchaseContextValue {
  isPremium: boolean;
  isLoading: boolean;
  purchasePremium: () => Promise<void>;
  restorePurchases: () => Promise<void>;
}

const PurchaseContext = createContext<PurchaseContextValue>({
  isPremium: false,
  isLoading: true,
  purchasePremium: async () => {},
  restorePurchases: async () => {},
});

export const usePurchase = () => useContext(PurchaseContext);

const isNative = Capacitor.isNativePlatform();

export const PurchaseProvider = ({ children }: { children: React.ReactNode }) => {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkEntitlement = useCallback(async () => {
    if (!isNative) {
      setIsLoading(false);
      return;
    }
    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      setIsPremium(!!entitlement?.isActive);
    } catch {
      setIsPremium(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isNative) {
      setIsLoading(false);
      return;
    }

    const platform = Capacitor.getPlatform();
    const apiKey = platform === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

    Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    Purchases.configure({ apiKey }).then(() => {
      checkEntitlement();
    }).catch(() => {
      setIsLoading(false);
    });

    const listenerRef = { remove: () => {} };

    Purchases.addCustomerInfoUpdateListener((customerInfo) => {
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      setIsPremium(!!entitlement?.isActive);
    }).then((listener) => {
      listenerRef.remove = listener.remove;
    });

    return () => {
      listenerRef.remove();
    };
  }, [checkEntitlement]);

  const purchasePremium = useCallback(async () => {
    if (!isNative) {
      alert('Las compras en la app solo están disponibles en dispositivos móviles.');
      return;
    }
    try {
      const { offerings } = await Purchases.getOfferings();
      const offering = offerings.current;

      let targetPackage = offering?.availablePackages?.find(
        (pkg) => pkg.product.identifier === PRODUCT_ID
      ) ?? offering?.availablePackages?.[0];

      if (!targetPackage) {
        throw new Error('No hay paquetes disponibles.');
      }

      const { customerInfo } = await Purchases.purchasePackage({ aPackage: targetPackage });
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      setIsPremium(!!entitlement?.isActive);
    } catch (error: any) {
      if (!error?.userCancelled) {
        throw error;
      }
    }
  }, []);

  const restorePurchases = useCallback(async () => {
    if (!isNative) {
      alert('La restauración de compras solo está disponible en dispositivos móviles.');
      return;
    }
    try {
      const { customerInfo } = await Purchases.restorePurchases();
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      setIsPremium(!!entitlement?.isActive);
      if (entitlement?.isActive) {
        alert('¡Compras restauradas exitosamente! Ya tienes acceso Premium.');
      } else {
        alert('No se encontraron compras previas asociadas a tu cuenta.');
      }
    } catch {
      alert('Ocurrió un error al restaurar las compras. Inténtalo de nuevo.');
    }
  }, []);

  return (
    <PurchaseContext.Provider value={{ isPremium, isLoading, purchasePremium, restorePurchases }}>
      {children}
    </PurchaseContext.Provider>
  );
};
