import { useEffect, useState, type ReactNode } from "react";
import AsciiBackground from "./AsciiBackground";
import DotMatrixBackground from "./DotMatrixBackground";
import GlitchText from "./GlitchText";
import logo from "../assets/logo.webp";

/**
 * Фон на весь экран. Переключатель для быстрого отката:
 *  - false — как было: герб-фон только в шапке, светлый фон под контентом;
 *  - true  — ASCII-фон с гербом на весь экран (тёмная тема через .bg-fs-root).
 */
const FULLSCREEN_BACKGROUND = false;

/** Стандартный глиф ₽ (U+20BD), отрисованный шрифтом приложения в canvas →
 *  data URL: подаётся в AsciiBackground как часть единого фона шапки.
 *  Ждём загрузку Minecraft-шрифта — без него canvas рисует Courier-фолбэк.
 *  null — canvas/font API недоступны (jsdom), слой не рисуем */
function useRubleGlyphImage(): string | null {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let disposed = false;
    const draw = () => {
      if (disposed) return;
      const size = 256;
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      const g = c.getContext("2d");
      if (!g) return;
      g.fillStyle = "#f97316";
      g.font = "bold 200px 'Arial', sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("\u20BD", size / 2, size / 2 + 10);
      setSrc(c.toDataURL("image/png"));
    };
    // Arial — системный шрифт, грузить нечего; рисуем сразу (но через
    // document.fonts.ready на случай блокировки/подкачки шрифтов браузером)
    (document.fonts?.ready ?? Promise.resolve())
      .catch(() => {})
      .then(draw);
    return () => {
      disposed = true;
    };
  }, []);
  return src;
}

export default function AppShell({ children }: { children: ReactNode }) {
  const rubleGlyph = useRubleGlyphImage();

  if (FULLSCREEN_BACKGROUND) {
    return (
      <div className="bg-fs-root relative min-h-dvh">
        {/* Фиксированный фон на весь вьюпорт, без вуали — текстура в полную силу.
            Контент лежит прямо на фоне; читаемость обеспечивает CSS
            (.bg-fs-root в index.css): светлый текст вне карточек/белых поверхностей. */}
        <div className="fixed inset-0 z-0">
          <AsciiBackground
            className="absolute inset-0"
            cellSize={6}
            src={logo}
          />
        </div>
        <div className="relative z-10">
          <header className="text-white">
            <div className="mx-auto max-w-xl px-4 py-12 sm:py-16">
              <GlitchText
                as="p"
                text="ПГУ им. Шолом-Алейхема"
                speed={2800}
                className="text-sm font-semibold uppercase tracking-widest text-orange-300 sm:text-base"
              />
              <GlitchText
                as="h1"
                text="Экономика — твой выбор"
                speed={2200}
                className="mt-2 text-3xl font-bold leading-tight sm:text-4xl"
              />
            </div>
          </header>
          <main className="mx-auto max-w-xl px-4 pb-10">{children}</main>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh text-stone-900">
      {/* Dot Matrix — фон всей страницы вместо белого (WebGL, ogl).
          Палитра нюдовая (ближе к белому), сверху светлая вуаль —
          иначе паттерн сливается с текстом. Вуаль без backdrop-blur:
          блюр поверх анимированного канваса на весь экран непосилен
          для слабых устройств и вешает авто-тесты */}
      <div className="fixed inset-0 z-0">
        <DotMatrixBackground
          className="absolute inset-0"
          colors={["#FFFFFF", "#F0C9A0", "#D9A268"]}
        />
        <div className="pointer-events-none absolute inset-0 bg-[#fff7ed]/50" />
      </div>
      <div className="relative z-10">
      <header className="relative overflow-hidden bg-stone-950 text-white">
        {/* Слой 1: процедурный фон крупными ячейками (без герба).
            Яркость/контраст подняты: чистый процедурный градиент темнее фото,
            без этого воксели после нормализации почти исчезают */}
        {/* Процедурный фон шапки + оранжевая вуаль: градиент сверху даёт
            тёплое свечение, снизу затемняет — текст читается увереннее,
            а переход к светлому контенту выглядит мягче */}
        <AsciiBackground
          className="absolute inset-0"
          cellSize={8}
          brightness={55}
          contrast={140}
          animIntensity={60}
        />
        {/* Знак рубля — часть общего воксельного полотна (та же ячейка 3.6),
            но ярче и контрастнее фона — выделяется из шума; размер подобран
            так, чтобы знак был виден полностью, без обрезки */}
        <AsciiBackground
          className="absolute inset-0"
          src={rubleGlyph ?? undefined}
          fit="contain"
          imageScale={1.35}
          imageOffsetX={0.34}
          cellSize={3.6}
          brightness={110}
          contrast={160}
          animIntensity={60}
          backgroundColor="transparent"
          proceduralBg={false}
          tintOpacity={0}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-orange-500/15 via-transparent to-stone-950/70" />
        <div className="relative mx-auto flex max-w-xl items-start justify-between gap-4 px-4 py-10 sm:py-12">
          <div className="flex flex-col gap-2">
            <GlitchText
              as="p"
              text="ПГУ им. Шолом-Алейхема"
              speed={2800}
              className="text-sm font-semibold uppercase tracking-widest text-orange-300 sm:text-base"
            />
            <GlitchText
              as="h1"
              text="Экономика — твой выбор"
              speed={2200}
              className="text-left text-3xl font-bold leading-tight sm:text-4xl"
            />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
