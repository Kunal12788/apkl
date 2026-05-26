export const appCache: Record<string, { data: any; timestamp: number }> = {};

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
};

export const clearCache = (key?: string) => {
  if (key) {
    delete appCache[key];
  } else {
    for (const k in appCache) {
      delete appCache[k];
    }
  }
};
