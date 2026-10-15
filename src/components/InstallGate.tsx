import { useState } from "react";
import { isStandalone } from "../lib/pwa";

const instructions: Record<string, string> = {
  Android:
    "Откройте меню браузера (⋮) и выберите «Установить приложение» / «Добавить на главный экран».",
  iOS: "В Safari нажмите кнопку «Поделиться» и выберите «На экран “Домой”».",
  Windows:
    "В Chrome или Edge нажмите значок установки в адресной строке или меню → «Установить приложение».",
  macOS:
    "В Chrome или Edge нажмите значок установки в адресной строке или меню → «Установить приложение».",
};

export default function InstallGate({ children }: { children: React.ReactNode }) {
  const [dismissed, setDismissed] = useState(false);
  if (isStandalone() || dismissed) return <>{children}</>;

  return (
    <section aria-label="Установка приложения" className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Установите приложение</h2>
      <p className="text-sm text-slate-600">
        «ПГУ: Экономика — твой выбор» работает как приложение: устанавливается
        на устройство, открывается без браузерной панели и работает офлайн
        после первой загрузки.
      </p>

      <div className="flex flex-col gap-3">
        {Object.entries(instructions).map(([platform, text]) => (
          <div
            key={platform}
            className="rounded-xl border border-slate-200 bg-white p-3"
          >
            <p className="text-sm font-medium">{platform}</p>
            <p className="mt-1 text-sm text-slate-600">{text}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        data-testid="continue-in-browser"
        onClick={() => setDismissed(true)}
        className="min-h-11 rounded-lg border border-slate-300 bg-white px-6 font-medium text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
      >
        Продолжить в браузере
      </button>
    </section>
  );
}
