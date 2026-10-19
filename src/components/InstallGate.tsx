import { useState } from "react";
import { isStandalone } from "../lib/pwa";
import installHintGif from "../assets/install-hint.gif";
import PixelButton from "./PixelButton";
import PixelCard from "./PixelCard";

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
      <p className="text-sm text-stone-600">
        «Твой выбор» работает как приложение: устанавливается на устройство,
        открывается без браузерной панели и работает офлайн после первой
        загрузки.
      </p>

      <img
        src={installHintGif}
        alt="Анимация: как установить приложение на устройство"
        width={128}
        height={128}
        className="mx-auto rounded-lg"
      />

      <div className="flex flex-col gap-3">
        {Object.entries(instructions).map(([platform, text]) => (
          <PixelCard key={platform}>
            <p className="text-sm font-medium">{platform}</p>
            <p className="mt-1 text-sm text-stone-600">{text}</p>
          </PixelCard>
        ))}
      </div>

      <PixelButton
        type="button"
        variant="primary"
        data-testid="continue-in-browser"
        onClick={() => {
          setDismissed(true);
          // после скрытия гейта контент смещается вверх — возвращаем
          // прокрутку к началу страницы, иначе остаёмся «в глубине»
          requestAnimationFrame(() => window.scrollTo(0, 0));
        }}
        className="min-h-11 px-6 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
      >
        Продолжить в браузере
      </PixelButton>
    </section>
  );
}
