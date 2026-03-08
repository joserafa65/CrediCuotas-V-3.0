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

      console.log("DEBUG entitlement:", entitlement);

      setIsPremium(!!entitlement?.isActive);

    } catch (error) {
      console.log("DEBUG checkEntitlement error:", error);
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

    import('@revenuecat/purchases-capacitor')
      .then(({ Purchases, LOG_LEVEL }) => {

        console.log("DEBUG RevenueCat configure start");

        Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

        Purchases.configure({ apiKey })
          .then(() => {
            console.log("DEBUG RevenueCat configured OK");
            checkEntitlement();
          })
          .catch((error) => {
            console.log("DEBUG configure error:", error);
            setIsLoading(false);
          });

        Purchases.addCustomerInfoUpdateListener((customerInfo) => {
          const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];

          console.log("DEBUG customerInfoUpdate:", customerInfo);

          setIsPremium(!!entitlement?.isActive);
        }).then((listener: any) => {
          listenerRef.remove = listener.remove;
        });

      })
      .catch((error) => {
        console.log("DEBUG RevenueCat import error:", error);
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

      console.log("DEBUG purchasePremium start");

      const offerings = await Purchases.getOfferings();

      console.log("DEBUG offerings RAW:", JSON.stringify(offerings));
      console.log("DEBUG offerings.current:", JSON.stringify(offerings.current));
      console.log("DEBUG offerings.all:", JSON.stringify(offerings.all));

      const offering = offerings.current;

      if (!offering) {

        console.log("DEBUG no offering returned");

     const products = await Purchases.getProducts({
  productIdentifiers: ['com.labappstudio.credicuotas.pro.lifetime']
});

        console.log("DEBUG direct products from Apple:", JSON.stringify(products));

        alert("Error técnico: RevenueCat no recibió offerings.");
        return;
      }

   const targetPackage = offering.availablePackages[0];

      if (!targetPackage) {

        console.log("DEBUG available packages:", JSON.stringify(offering.availablePackages));

        alert("Error técnico: existe offering pero no paquete lifetime.");
        return;
      }

      console.log("DEBUG purchasing package:", targetPackage);

      const { customerInfo } = await Purchases.purchasePackage({
        aPackage: targetPackage
      });

      console.log("DEBUG purchase result:", customerInfo);

      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];

      setIsPremium(!!entitlement?.isActive);

    } catch (error: any) {

      console.error("ERROR CRITICO COMPRA:", error);

      if (!error?.userCancelled) {
        alert(`Error al procesar compra: ${error?.message || 'Error desconocido'}`);
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

      console.log("DEBUG restore result:", customerInfo);

      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];

      setIsPremium(!!entitlement?.isActive);

      if (entitlement?.isActive) {
        alert('¡Compras restauradas exitosamente!');
      } else {
        alert('No se encontraron compras previas.');
      }

    } catch (error) {

      console.log("DEBUG restore error:", error);

      alert('Ocurrió un error al restaurar las compras.');
    }

  }, []);

  return (
    <PurchaseContext.Provider value={{ isPremium, isLoading, purchasePremium, restorePurchases }}>
      {children}
    </PurchaseContext.Provider>
  );
};