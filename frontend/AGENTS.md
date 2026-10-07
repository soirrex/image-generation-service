# AGENTS.md — Frontend

Stack: React 19 + TypeScript + Vite + React Router v8 + Tailwind CSS v4.

## Project structure

```
src/
  pages/        — pages (routes) only. One file = one route. Example: Main.tsx -> MainPage
  components/   — reusable UI components only
  hooks/
    useApi.ts   — shared API core: the ONLY file that touches the network/env
    useAuth.ts  — auth domain hook (login/register/logout), built on useApi
  main.tsx      — router (createBrowserRouter) and mount only
```

Do not create other top-level folders in `src/` without agreement. Utilities/types live next to usage until there are >=3 of them, then move to `src/lib/` or `src/types/`.

## Rule #1: All API only via domain hooks built on `useApi.ts`

1. NO `fetch` / `axios` / `XMLHttpRequest` in `pages/` and `components/`. Only domain hook calls (`useAuth`, ...).
2. `useApi.ts` is the only file that knows `VITE_BASE_API` (`VITE_API_URL` fallback), `headers`, `credentials`, error parsing. It exposes the generic `useApi()` state wrapper (`isLoading` / `error` / `clearError` / `call`). Domain hooks reuse it, never reimplement network logic.
3. One domain = one hook in `hooks/`, named `use<Domain>` (`useAuth`, `useUsers`, ...). `useAuth.ts` owns `login` / `register` / `logout`. New endpoint = new function in the matching domain hook (create `useX.ts` if none exists yet), never a call from a component:

```ts
// in useAuth.ts
export function useAuth() {
  const { isLoading, error, clearError, call } = useApi();
  const login = (dto: AuthDto) => call<MessageResponse>("POST", "/api/auth/login", dto);
  // ...
  return { isLoading, error, clearError, login, register, logout };
}
// in page/component
const { login, isLoading, error } = useAuth();
```

4. The hook owns `isLoading` / `error`. Components only render these states, no duplicated try/catch for network.

## Rule #2: Pages

- `src/pages/*.tsx` export a named `*Page` component (example: `export function MainPage()`).
- A page is a thin composition layer: assembles components from `components/`, calls a domain hook (`useAuth`, ...), holds local UI state.
- FORBIDDEN in a page: JSX markup over ~100 lines (extract to components), business logic, data formatting, style dumps.
- Routes are registered only in `src/main.tsx` via `createBrowserRouter`.

## Rule #3: Components — composition and SRP

Mandatory principles:

1. **Composition over monoliths:** a small component does one thing. Complex UI is assembled from small ones: `UserCard` = `Avatar` + `UserName` + `FollowButton`, not one 300-line file.
2. **Single Responsibility:** one component = one responsibility (rendering / form / layout). No "God components".
3. **Presentational by default:** a component receives data via props and callbacks (`onSubmit`, `onSelect`), does not fetch data itself and does not call domain hooks directly (exception — only if the component is self-sufficient, e.g. `UserList`, then it also goes through the matching domain hook).
4. **Typed props:** `interface UserCardProps { user: User; onSelect: (id: string) => void }`. No `any`.
5. **Reusability:** if JSX is copied a 2nd time — extract to `src/components/`. File name = component name: `components/UserCard.tsx` -> `export function UserCard()`.
6. **State lives low:** state lives in the lowest common parent. Do not pull in a global store unless needed.

Correct page composition example:

```tsx
export function MainPage() {
  const { getUsers, isLoading, error } = useUsers();
  // ...
  return (
    <PageLayout>
      <UserList users={users} isLoading={isLoading} error={error} />
    </PageLayout>
  );
}
```

## TypeScript / Style

- Named exports only for components/hooks (`export function`), no `default`.
- `PascalCase` for components and files in `pages/` and `components/`, `camelCase` for hooks (`useApi.ts`, `useAuth.ts`).
- Do not use React's deprecated `FormEvent` type (`@types/react` marks it deprecated) — use `SyntheticEvent` instead.
- After changes run: `npm run build` (tsc + vite), `npm run lint` and `npm run format`.
