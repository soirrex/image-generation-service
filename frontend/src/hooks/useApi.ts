import { useCallback, useState } from "react";

type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface ApiErrorBody {
  error?: string;
  message?: string;
}

export interface MessageResponse {
  message: string;
}

const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function request<T>(method: Method, path: string, body?: object): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
  });

  if (!response.ok) {
    const text = await response.text();
    let parsed: ApiErrorBody | undefined;
    try {
      parsed = text ? (JSON.parse(text) as ApiErrorBody) : undefined;
    } catch {
      parsed = undefined;
    }
    throw new Error(parsed?.message ?? parsed?.error ?? `Request failed: ${response.status}`);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function useApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const call = useCallback(async <T>(method: Method, path: string, body?: object): Promise<T> => {
    setIsLoading(true);
    setError(null);
    try {
      return await request<T>(method, path, body);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, clearError, call };
}
