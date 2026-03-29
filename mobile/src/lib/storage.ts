import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  ACCESS_TOKEN: "accessToken",
  REFRESH_TOKEN: "refreshToken",
} as const;

// In-memory cache — keeps the sync API intact for axios interceptors / zustand
let memCache: { accessToken: string | null; refreshToken: string | null } = {
  accessToken: null,
  refreshToken: null,
};

/** Call once at app startup (before rendering) to hydrate the in-memory cache */
export const initStorage = async (): Promise<void> => {
  const [accessToken, refreshToken] = await Promise.all([
    AsyncStorage.getItem(KEYS.ACCESS_TOKEN),
    AsyncStorage.getItem(KEYS.REFRESH_TOKEN),
  ]);
  memCache.accessToken = accessToken;
  memCache.refreshToken = refreshToken;
};

export const tokenStorage = {
  getAccessToken: () => memCache.accessToken,
  getRefreshToken: () => memCache.refreshToken,
  setTokens: (accessToken: string, refreshToken: string) => {
    memCache.accessToken = accessToken;
    memCache.refreshToken = refreshToken;
    AsyncStorage.setItem(KEYS.ACCESS_TOKEN, accessToken);
    AsyncStorage.setItem(KEYS.REFRESH_TOKEN, refreshToken);
  },
  clearTokens: () => {
    memCache.accessToken = null;
    memCache.refreshToken = null;
    AsyncStorage.removeItem(KEYS.ACCESS_TOKEN);
    AsyncStorage.removeItem(KEYS.REFRESH_TOKEN);
  },
};
