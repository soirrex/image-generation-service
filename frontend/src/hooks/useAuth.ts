import { useCallback } from "react";
import { useApi } from "./useApi";
import type { MessageResponse } from "./useApi";

export interface AuthDto {
  email: string;
  password: string;
}

export function useAuth() {
  const { isLoading, error, clearError, call } = useApi();

  const register = useCallback(
    (dto: AuthDto) => call<MessageResponse>("POST", "/api/auth/register", dto),
    [call],
  );

  const login = useCallback(
    (dto: AuthDto) => call<MessageResponse>("POST", "/api/auth/login", dto),
    [call],
  );

  const logout = useCallback(() => call<MessageResponse>("POST", "/api/auth/logout", {}), [call]);

  return { isLoading, error, clearError, register, login, logout };
}
