import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

const REVENUECAT_API_KEY_IOS = 'appl_REPLACE_WITH_YOUR_IOS_KEY';
const REVENUECAT_API_KEY_ANDROID = 'goog_REPLACE_WITH_YOUR_ANDROID_KEY';
const ENTITLEMENT_ID = 'premium';
const PRODUCT_ID = 'com.labappstudio.credicuotas.pro.lifetime';

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
  const [isPremium, setIsPremium] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const checkEntitlement = useCallback(async () => {
    if (!isNative) {
      setIsLoading(false);
      return;
    }
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
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

    const listenerRef = { remove: () => {} };

    import('@revenuecat/purchases-capacitor').then(({ Purchases, LOG_LEVEL }) => {
      Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      Purchases.configure({ apiKey }).then(() => {
        checkEntitlement();
      }).catch(() => {
        setIsLoading(false);
      });

      Purchases.addCustomerInfoUpdateListener((customerInfo) => {
        const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
        setIsPremium(!!entitlement?.isActive);
      }).then((listener) => {
        listenerRef.remove = listener.remove;
      });
    }).catch(() => {
      setIsLoading(false);
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
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const { offerings } = await Purchases.getOfferings();
      const offering = offerings.current;

      const targetPackage = offering?.availablePackages?.find(
        (pkg) => pkg.product.identifier === PRODUCT_ID
      );

      if (!targetPackage) {
        throw new Error('Premium product not found');
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
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
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
