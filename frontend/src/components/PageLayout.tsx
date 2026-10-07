import type { ReactNode } from "react";
import { Header } from "./Header";

interface PageLayoutProps {
  children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-start px-4 py-10">
        {children}
      </main>
    </div>
  );
}
