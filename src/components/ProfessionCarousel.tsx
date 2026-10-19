import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Profession } from "../types/test";
import { programLabel } from "../lib/programLabel";
import PixelCard from "./PixelCard";

/** Минимальные поля программы, нужные карусели (полный Program совместим) */
export type ProgramInfo = {
  id: string;
  code: string;
  title: string;
  level: string;
};

type Props = {
  professions: Profession[];
  programs: ProgramInfo[];
  onOpenProfession: (professionId: string) => void;
};

const GAP = 16;
const MIN_CARD_W = 240;
const MAX_CARD_W = 320;

/**
 * Карусель профессий в начале галереи: карточки фиксированного размера,
 * переключение стрелками/свайпом со слайд-анимацией (transform).
 * Фотографии пока не добавлены — используется градиентная заглушка
 * с монограммой профессии. Клик по карточке открывает страницу профессии.
 */
export default function ProfessionCarousel({
  professions,
  programs,
  onOpenProfession,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportW, setViewportW] = useState(0);
  const [index, setIndex] = useState(0);
  const pointerStartX = useRef<number | null>(null);

  const programById = useMemo(
    () => new Map(programs.map((p) => [p.id, p])),
    [programs],
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => setViewportW(el.clientWidth);
    measure();
    if (typeof window.ResizeObserver !== "undefined") {
      const ro = new window.ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const reducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Ширина карточки адаптивная: ~72% ширины вьюпорта, но в границах
  // MIN/MAX — на телефоне одна карточка плюс «подглядывание» следующей.
  const cardW = Math.round(
    Math.min(MAX_CARD_W, Math.max(MIN_CARD_W, viewportW * 0.72)),
  );
  const pitch = cardW + GAP;

  // В jsdom clientWidth = 0: maxIndex = 0, обе кнопки задизейблены (см. тест).
  const perView = Math.max(1, Math.floor((viewportW + GAP) / pitch) || 1);
  const maxIndex =
    viewportW > 0 ? Math.max(0, professions.length - perView) : 0;
  const current = Math.min(index, maxIndex);
  const canLeft = current > 0;
  const canRight = current < maxIndex;

  const go = useCallback(
    (dir: 1 | -1) =>
      setIndex((i) =>
        Math.max(0, Math.min(maxIndex, Math.min(i, maxIndex) + dir)),
      ),
    [maxIndex],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    pointerStartX.current = e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const start = pointerStartX.current;
    pointerStartX.current = null;
    if (start == null) return;
    const dx = e.clientX - start;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  };

  return (
    <section aria-label="Карусель профессий" className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-base font-medium text-stone-700">Наши профессии</h3>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Прокрутить карусель назад"
            data-testid="carousel-prev"
            disabled={!canLeft}
            onClick={() => go(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 transition-colors hover:border-orange-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            type="button"
            aria-label="Прокрутить карусель вперёд"
            data-testid="carousel-next"
            disabled={!canRight}
            onClick={() => go(1)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 transition-colors hover:border-orange-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        data-testid="profession-carousel"
        className="-mx-4 overflow-hidden px-4"
        style={{ touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <div
          className="flex items-stretch"
          style={{
            gap: GAP,
            transform: `translateX(-${current * pitch}px)`,
            transition:
              reducedMotion || viewportW === 0
                ? "none"
                : "transform 400ms cubic-bezier(0.22, 1, 0.36, 1)",
            willChange: "transform",
          }}
        >
          {professions.map((profession) => (
            <div
              key={profession.id}
              className="shrink-0"
              style={{ width: cardW }}
            >
              <button
                type="button"
                data-testid="profession-carousel-card"
                data-carousel-card
                onClick={() => onOpenProfession(profession.id)}
                aria-label={`Открыть профессию «${profession.title}»`}
                className="flex h-full w-full flex-col text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
              >
                <PixelCard className="flex h-full w-full flex-col" style={{ padding: 8 }}>
                  <span
                    aria-hidden="true"
                    className="mb-2 flex h-32 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 via-amber-500 to-orange-700 text-4xl font-bold text-white/70"
                  >
                    {profession.title.charAt(0)}
                  </span>
                  <span className="block min-h-10 text-sm font-medium leading-snug line-clamp-2">
                    {profession.title}
                  </span>
                  <span className="mt-1 block truncate text-xs text-orange-700">
                    {programLabel(programById.get(profession.programId))}
                  </span>
                </PixelCard>
              </button>
            </div>
          ))}
          {professions.length === 0 && (
            <p className="text-sm text-stone-500">Профессии пока не добавлены.</p>
          )}
        </div>
      </div>
    </section>
  );
}
