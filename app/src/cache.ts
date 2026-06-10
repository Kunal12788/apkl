export const appCache: Record<string, { data: any; timestamp: number }> = {};

// Load initial cache from localStorage to survive page refreshes
try {
  const stored = localStorage.getItem('aurora_app_cache');
  if (stored) {
    const parsed = JSON.parse(stored);
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
      localStorage.setItem('aurora_app_cache', JSON.stringify(appCache));
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

