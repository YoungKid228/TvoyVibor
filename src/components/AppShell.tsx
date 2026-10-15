import type { ReactNode } from "react";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-xl px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            ПГУ им. Шолом-Алейхема
          </p>
          <h1 className="text-lg font-semibold leading-tight">
            Экономика — твой выбор
          </h1>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-6">{children}</main>
    </div>
  );
}
