import { MMKV } from "react-native-mmkv";

export const storage = new MMKV({ id: "furniroom-storage" });

const KEYS = {
  ACCESS_TOKEN: "accessToken",
  REFRESH_TOKEN: "refreshToken",
} as const;

export const tokenStorage = {
  getAccessToken: () => storage.getString(KEYS.ACCESS_TOKEN) ?? null,
  getRefreshToken: () => storage.getString(KEYS.REFRESH_TOKEN) ?? null,
  setTokens: (accessToken: string, refreshToken: string) => {
    storage.set(KEYS.ACCESS_TOKEN, accessToken);
    storage.set(KEYS.REFRESH_TOKEN, refreshToken);
  },
  clearTokens: () => {
    storage.delete(KEYS.ACCESS_TOKEN);
    storage.delete(KEYS.REFRESH_TOKEN);
  },
};
