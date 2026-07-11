// services/authService.ts
import { apiClient, setTokens, clearTokens } from "./client";
import type { UserRegisterPayload, UserLoginPayload, TokenResponse, UserOut } from "@/types/api";

export const authService = {
  async register(payload: UserRegisterPayload): Promise<UserOut> {
    const { data } = await apiClient.post<UserOut>("/auth/register", payload);
    return data;
  },

  async login(payload: UserLoginPayload): Promise<TokenResponse> {
    const { data } = await apiClient.post<TokenResponse>("/auth/login", payload);
    setTokens(data.access_token, data.refresh_token);
    return data;
  },

  async loginDemo(): Promise<TokenResponse> {
    const { data } = await apiClient.post<TokenResponse>("/auth/demo-login");
    setTokens(data.access_token, data.refresh_token);
    return data;
  },

  logout() {
    clearTokens();
  },
};
