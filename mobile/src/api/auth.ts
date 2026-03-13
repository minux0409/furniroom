import { api } from "@/lib/api";
import type { User } from "@/types";

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export const authApi = {
  googleLogin: (idToken: string): Promise<{ data: AuthResponse }> =>
    api.post("/auth/google", { idToken }),

  refresh: (refreshToken: string): Promise<{ data: AuthResponse }> =>
    api.post(
      "/auth/refresh",
      {},
      { headers: { Authorization: `Bearer ${refreshToken}` } },
    ),

  logout: (): Promise<void> => api.post("/auth/logout"),
};
