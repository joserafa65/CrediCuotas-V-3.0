export const LOG_LEVEL = { DEBUG: 'DEBUG', INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR' };

export const Purchases = {
  setLogLevel: async () => {},
  configure: async () => {},
  getCustomerInfo: async () => ({ customerInfo: { entitlements: { active: {} } } }),
  getOfferings: async () => ({ offerings: { current: null } }),
  purchasePackage: async () => ({ customerInfo: { entitlements: { active: {} } } }),
  restorePurchases: async () => ({ customerInfo: { entitlements: { active: {} } } }),
  addCustomerInfoUpdateListener: async () => ({ remove: () => {} }),
};
