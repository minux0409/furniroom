import { create } from "zustand";
import { tokenStorage } from "@/lib/storage";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: !!tokenStorage.getAccessToken(),
  setAuth: (user, accessToken, refreshToken) => {
    tokenStorage.setTokens(accessToken, refreshToken);
    set({ user, isLoggedIn: true });
  },
  logout: () => {
    tokenStorage.clearTokens();
    set({ user: null, isLoggedIn: false });
  },
}));
