import { useEffect, useState, type ReactNode } from "react";
import AsciiBackground from "./AsciiBackground";
import DotMatrixBackground from "./DotMatrixBackground";
import GlitchText from "./GlitchText";
import logo from "../assets/logo.webp";
import pguLogo from "../assets/pgu-logo.png";

/** Перекраска хроматических пикселей в оранжевый: синий логотип ПГУ
 *  приводится к фирменному оранжевому, белые/чёрные детали не трогаются */
function recolorToOrange(img: HTMLImageElement): string | null {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  if (c.width < 1 || c.height < 1) return null;
  const g = c.getContext("2d");
  if (!g) return null;
  try {
    g.drawImage(img, 0, 0);
    const data = g.getImageData(0, 0, c.width, c.height);
    const px = data.data;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] === 0) continue;
      const r = px[i] / 255;
      const gr = px[i + 1] / 255;
      const b = px[i + 2] / 255;
      const max = Math.max(r, gr, b);
      const min = Math.min(r, gr, b);
      const l = (max + min) / 2;
      const d = max - min;
      const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
      // Строгая оранжевая гамма без выбросов: насыщенность дотягиваю до 0.85,
      // светлоту держу в 0.34–0.78 — без белых/жёлтых/красных, но достаточно
      // светло на тёмном фоне шапки. Оттенок 26°
      const s2 = Math.min(1, Math.max(s, 0.85));
      const l2 = Math.min(0.78, 0.34 + l * 0.44);
      {
        const q = l2 < 0.5 ? l2 * (1 + s2) : l2 + s2 - l2 * s2;
        const p = 2 * l2 - q;
        const t = (h: number) => {
          const x = ((h % 1) + 1) % 1;
          if (x < 1 / 6) return p + (q - p) * 6 * x;
          if (x < 1 / 2) return q;
          if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
          return p;
        };
        // Каналы: r = f(h+1/3), g = f(h), b = f(h-1/3)
        px[i] = Math.round(t(26 / 360 + 1 / 3) * 255);
        px[i + 1] = Math.round(t(26 / 360) * 255);
        px[i + 2] = Math.round(t(26 / 360 - 1 / 3) * 255);
      }
    }
    g.putImageData(data, 0, 0);
    return c.toDataURL("image/png");
  } catch {
    return null;
  }
}

/** Загружает логотип и возвращает data-URL его оранжевой версии.
 *  ok=false — перекрасить не удалось (canvas недоступен): покажем исходник,
 *  доведя до оранжевого CSS-фильтром */
function useOrangeLogo(src: string): { src: string; ok: boolean } {
  const [out, setOut] = useState<{ src: string; ok: boolean } | null>(null);
  useEffect(() => {
    let disposed = false;
    const img = new Image();
    img.onload = () => {
      if (disposed) return;
      const rec = recolorToOrange(img);
      setOut(rec ? { src: rec, ok: true } : { src, ok: false });
    };
    img.src = src;
    return () => {
      disposed = true;
    };
  }, [src]);
  return out ?? { src, ok: false };
}

/**
 * Фон на весь экран. Переключатель для быстрого отката:
 *  - false — как было: герб-фон только в шапке, светлый фон под контентом;
 *  - true  — ASCII-фон с гербом на весь экран (тёмная тема через .bg-fs-root).
 */
const FULLSCREEN_BACKGROUND = false;

export default function AppShell({ children }: { children: ReactNode }) {
  const headerLogo = useOrangeLogo(pguLogo);

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
        <AsciiBackground
          className="absolute inset-0"
          cellSize={9}
          brightness={45}
          contrast={130}
          animIntensity={50}
        />
        {/* Логотип крупнее, но высота шапки прежняя: +32px к логотипу
            компенсированы -32px вертикальных отступов. self-start — левый
            край логотипа совпадает с началом текста страницы (px-4) */}
        <div className="relative mx-auto flex max-w-xl flex-col items-center gap-2 px-4 py-1 sm:py-5">
          {/* Логотип ПГУ вместо герба — воксельный слой, СТАТИЧНЫЙ (без
              анимации — она давала лаги и «кривые» буквы), с постэффектами
              сканлайны + зерно (один наложенный кадр). Bloom выключен:
              аддитивное свечение неизбежно даёт белые пиксели. Глитч —
              разовый артефакт на статике. Анимация — только у фона шапки */}
          <div
            className="relative aspect-[1322/487] w-full max-w-[416px] self-start"
            style={
              headerLogo.ok
                ? undefined
                : {
                    filter:
                      "sepia(1) saturate(3.5) hue-rotate(-18deg) brightness(1.15)",
                  }
            }
          >
            <AsciiBackground
              className="absolute inset-0"
              src={headerLogo.src}
              fit="contain"
              imageScale={1}
              cellSize={2}
              brightness={90}
              contrast={160}
              animIntensity={0}
              backgroundColor="transparent"
              tintOpacity={0}
              proceduralBg={false}
              postEffects={{
                scanLines: { enabled: true, intensity: 30 },
                vignette: { enabled: false, intensity: 0 },
                bloom: { enabled: false, intensity: 0 },
                glitch: { enabled: false, intensity: 0 },
                filmGrain: { enabled: true, intensity: 25 },
              }}
            />
          </div>
          <GlitchText
            as="h1"
            text="Экономика — твой выбор"
            speed={2200}
            className="self-start text-left text-2xl font-bold leading-tight sm:text-3xl"
          />
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
