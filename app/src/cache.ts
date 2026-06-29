export const appCache: Record<string, { data: any; timestamp: number }> = {};

const XOR_KEY = 'aurora_secure_salt_99';
const xorEncryptDecrypt = (input: string): string => {
  let output = '';
  for (let i = 0; i < input.length; i++) {
    output += String.fromCharCode(input.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length));
  }
  return output;
};

const encrypt = (text: string) => {
  const xor = xorEncryptDecrypt(text);
  return btoa(unescape(encodeURIComponent(xor)));
};

const decrypt = (cipher: string) => {
  const decoded = decodeURIComponent(escape(atob(cipher)));
  return xorEncryptDecrypt(decoded);
};

// Load initial cache from localStorage to survive page refreshes
try {
  const stored = localStorage.getItem('aurora_app_cache');
  if (stored) {
    const decrypted = decrypt(stored);
    const parsed = JSON.parse(decrypted);
    Object.assign(appCache, parsed);
  }
} catch (e) {
  console.error('Failed to load cache from localStorage', e);
}

let saveTimeout: any = null;
const saveCacheToStorage = () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      const encrypted = encrypt(JSON.stringify(appCache));
      localStorage.setItem('aurora_app_cache', encrypted);
    } catch (e) {
      console.error('Failed to save cache to localStorage', e);
    }
    saveTimeout = null;
  }, 50);
};

export const getCachedData = (key: string, maxAgeMs = 300000) => {
  const cached = appCache[key];
  if (cached && (Date.now() - cached.timestamp < maxAgeMs)) {
    return cached.data;
  }
  return null;
};

export const setCachedData = (key: string, data: any) => {
  appCache[key] = {
    data,
    timestamp: Date.now()
  };
  saveCacheToStorage();
};

export const clearCache = (key?: string) => {
  if (key) {
    delete appCache[key];
  } else {
    for (const k in appCache) {
      delete appCache[k];
    }
  }
  saveCacheToStorage();
};

export const clearCachePrefix = (prefix: string) => {
  for (const k in appCache) {
    if (k.startsWith(prefix)) {
      delete appCache[k];
    }
  }
  saveCacheToStorage();
};

export const clearAllDataCaches = () => {
  clearCache('tx_data');
  clearCache('tasks_data');
  clearCache('staff_billing_tx');
  clearCachePrefix('ledger_');
  clearCachePrefix('stock_allocations_');
};


