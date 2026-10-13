import { useCallback, useState } from "react";

type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export class ApiError extends Error {
  status: number;
  error: string;

  constructor(status: number, message: string, error: string) {
    super(message);
    this.status = status;
    this.error = error;
  }
}

export interface ApiErrorBody {
  message: string;
  error: string;
  status: number;
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
    let parsed: { message?: unknown; error?: unknown; statusCode?: unknown } | undefined;
    try {
      parsed = text ? (JSON.parse(text) as typeof parsed) : undefined;
    } catch {
      parsed = undefined;
    }

    const message =
      typeof parsed?.message === "string" && parsed.message.length > 0
        ? parsed.message
        : `Request failed: ${response.status}`;
    const error =
      typeof parsed?.error === "string" && parsed.error.length > 0
        ? parsed.error
        : response.status >= 500
          ? "Internal Server Error"
          : "Bad Request";

    throw new ApiError(response.status, message, error);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function useApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiErrorBody | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const call = useCallback(async <T>(method: Method, path: string, body?: object): Promise<T> => {
    setIsLoading(true);
    setError(null);
    try {
      return await request<T>(method, path, body);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      const error = e instanceof ApiError ? e.error : "Unknown error";
      const status = e instanceof ApiError ? e.status : 500;
      setError({ status: status, message: message, error: error });
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, clearError, call };
}
