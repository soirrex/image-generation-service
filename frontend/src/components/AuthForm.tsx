import { useState } from "react";
import type { SyntheticEvent } from "react";
import { FormField } from "./FormField";
import type { AuthDto } from "../hooks/useAuth";
import type { ApiErrorBody } from "../hooks/useApi";

interface AuthFormProps {
  mode: "login" | "register";
  isLoading: boolean;
  error: ApiErrorBody | null;
  onSubmit: (dto: AuthDto) => void;
}

const TITLES: Record<AuthFormProps["mode"], { title: string; button: string }> = {
  login: { title: "Log in", button: "Log in" },
  register: { title: "Sign up", button: "Sign up" },
};

export function AuthForm({ mode, isLoading, error, onSubmit }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    onSubmit({ email: email.trim(), password });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h1 className="text-xl font-semibold text-gray-900">{TITLES[mode].title}</h1>

      <FormField
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        autoComplete="email"
      />
      <FormField
        id="password"
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="••••••••"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
      />

      {error !== null && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? "Loading..." : TITLES[mode].button}
      </button>
    </form>
  );
}
