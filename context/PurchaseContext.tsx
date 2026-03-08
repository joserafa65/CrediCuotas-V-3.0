import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

const REVENUECAT_API_KEY_IOS = 'appl_ukyhiDdHwFcMuGQJopDPHgKtoNY';
const REVENUECAT_API_KEY_ANDROID = 'goog_REPLACE_WITH_YOUR_ANDROID_KEY';
const ENTITLEMENT_ID = 'premium';

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
      }).then((listener: any) => {
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
      const offerings = await Purchases.getOfferings();

      // Obtenemos el offering marcado como default
      const offering = offerings.current;

      if (!offering) {
        console.error("No se encontró el offering");
        alert("El producto premium no está disponible en este momento.");
        return;
      }

      // Usamos la propiedad .lifetime que mapea automáticamente al paquete $rc_lifetime
      const targetPackage = offering.lifetime;

      if (!targetPackage) {
        console.error("No se encontró el paquete lifetime en el offering");
        alert("No se pudo cargar el paquete de compra.");
        return;
      }

      const { customerInfo } = await Purchases.purchasePackage({ aPackage: targetPackage });
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      setIsPremium(!!entitlement?.isActive);

    } catch (error: any) {
      if (!error?.userCancelled) {
        console.error("Error de compra:", error);
        alert("Ocurrió un error al procesar la compra.");
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
        alert('¡Compras restauradas exitosamente!');
      } else {
        alert('No se encontraron compras previas.');
      }
    } catch {
      alert('Ocurrió un error al restaurar las compras.');
    }
  }, []);

  return (
    <PurchaseContext.Provider value={{ isPremium, isLoading, purchasePremium, restorePurchases }}>
      {children}
    </PurchaseContext.Provider>
  );
};