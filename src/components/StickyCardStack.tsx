import { Fragment, useEffect, useRef } from "react";

/**
 * StickyCardStack — адаптация skiper-ui «Scroll images reveal 003» (skiper34).
 * Липкие карточки: при скролле следующая карточка наезжает сверху, а
 * предыдущая уменьшается и поворачивается; картинка внутри вращается в
 * обратную сторону, компенсируя наклон кадра.
 *
 * Отличия от оригинала: без framer-motion/lenis (чистый position: sticky +
 * rAF-обработчик скролла окна) и высота карточки — по пропорциям самой
 * фотографии (фото альбомные, обрезать их object-cover'ом нельзя).
 * Последняя карточка не уходит (под ней нечему наезжать).
 *
 * Прогресс ухода считается по нулевому сентинелю перед карточкой:
 * getBoundingClientRect самой карточки искажается её же трансформацией.
 *
 * Производительность:
 *  - фаза чтения (позиции сентинелей) и фаза записи (трансформы) строго
 *    разделены и идут в одном кадре → нет layout-thrash;
 *  - сглаживание зависит от времени, а не от числа кадров (одинаково
 *    на 60 и 120 Гц), и отставание карточки ограничено — при быстром
 *    скролле она не «отстаёт» и не догоняет потом рывком;
 *  - когда все карточки settled, цикл кадров останавливается.
 */

export interface StickyCardItem {
  image: string;
  title?: string;
}

interface StickyCardStackProps {
  items: StickyCardItem[];
  className?: string;
}

/** Отступ сверху, на котором карточка «залипает» (в vh). */
const VERT_MARGIN_VH = 8;
/** Максимальный угол поворота уходящей карточки (в градусах). */
const MAX_ROT_DEG = 70;
/** Постоянная времени сглаживания (мс): меньше — карточка ближе к цели. */
const SMOOTH_TAU = 55;
/** Максимальное отставание карточки от цели (доля прогресса 0…1). */
const MAX_LAG = 0.28;

export default function StickyCardStack({
  items,
  className,
}: StickyCardStackProps) {
  const sentinelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);
  /** Отметка «карточка сейчас анимируется» — для willChange */
  const activeRefs = useRef<boolean[]>([]);
  /** Пропорции картинок (кэш): читать размеры в кадре нельзя */
  const aspectRefs = useRef<number[]>([]);

  useEffect(() => {
    const cards = cardRefs.current;
    const sentinels = sentinelRefs.current;
    const n = cards.length;
    if (!n) return;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const active = activeRefs.current;
    const progress = new Float32Array(n).fill(-1);
    const target = new Float32Array(n).fill(-1);
    /** Кэш пропорций картинок — читать offsetWidth/Height в кадре нельзя */
    const aspects = aspectRefs.current;
    /** Кэш высот карточек */
    const heights = new Float32Array(n);

    let raf = 0;
    let lastTime = 0;
    let dirty = true;

    const measure = () => {
      for (let i = 0; i < n; i++) {
        const card = cards[i];
        if (card) heights[i] = card.offsetHeight;
        const img = imgRefs.current[i];
        if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
          aspects[i] = img.naturalWidth / img.naturalHeight;
        }
      }
    };

    const draw = (i: number, p: number) => {
      const el = cards[i];
      const img = imgRefs.current[i];
      if (!el) return;
      if (p <= 0.001) {
        if (active[i]) {
          active[i] = false;
          el.style.transform = "";
          el.style.opacity = "";
          el.style.willChange = "";
          if (img) img.style.transform = "";
        }
        return;
      }
      const rot = p * MAX_ROT_DEG;
      const scale = 1 - 0.92 * p;
      el.style.transform = `scale(${scale.toFixed(4)}) rotate(${rot.toFixed(2)}deg)`;
      // Затухание: уменьшенная карточка не должна маячить на заднем плане,
      // пока следующая ещё в пути.
      el.style.opacity = (1 - p).toFixed(3);
      if (!active[i]) {
        active[i] = true;
        // willChange только на время анимации: постоянные слои
        // композиции на телефоне съедают память
        el.style.willChange = "transform";
      }
      if (img) {
        // Компенсирующий поворот + масштаб, чтобы повёрнутое фото
        // накрывало кадр целиком (иначе в углах виден фон карточки).
        const rad = (rot * Math.PI) / 180;
        const aspect = aspects[i] || 1.4;
        const cover = Math.max(
          Math.cos(rad) + Math.sin(rad) / aspect,
          Math.cos(rad) + Math.sin(rad) * aspect,
        );
        img.style.transform = `rotate(${(-rot).toFixed(2)}deg) scale(${cover.toFixed(4)})`;
      }
    };

    // Фаза чтения: позиции сентинелей. Выполняется до любых записей
    // в стилях — иначе браузер пересчитывает раскладку дважды за кадр.
    const computeTargets = () => {
      const vh = window.innerHeight;
      if (vh < 1) return;
      const stickyTop = (VERT_MARGIN_VH / 100) * vh;
      for (let i = 0; i < n - 1; i++) {
        const sent = sentinels[i];
        if (!sent) continue;
        const span = Math.max(1, (heights[i] + vh * 0.06) * 0.9);
        const p =
          (stickyTop - sent.getBoundingClientRect().top) / span;
        target[i] = p < 0 ? 0 : p > 1 ? 1 : p;
      }
    };

    // Фаза записи: сглаживание прогресса и отрисовка.
    const frame = (t: number) => {
      const dt = lastTime ? Math.min(50, t - lastTime) : 16;
      lastTime = t;
      if (dirty) {
        dirty = false;
        computeTargets();
      }
      const alpha = 1 - Math.exp(-dt / SMOOTH_TAU);
      let moving = false;
      for (let i = 0; i < n - 1; i++) {
        const tgt = target[i];
        if (tgt < 0) continue;
        const cur = progress[i] < 0 ? tgt : progress[i];
        let next = cur + (tgt - cur) * alpha;
        // Отставание ограничиваем: карточка не «отваливается» от скролла
        // и не догоняет цель потом рывком.
        const diff = tgt - next;
        if (diff > MAX_LAG) next = tgt - MAX_LAG;
        else if (diff < -MAX_LAG) next = tgt + MAX_LAG;
        if (Math.abs(tgt - next) < 0.001) next = tgt;
        if (next !== progress[i]) {
          progress[i] = next;
          draw(i, next);
        }
        if (next !== tgt) moving = true;
      }
      if (moving || dirty) {
        raf = requestAnimationFrame(frame);
      } else {
        raf = 0;
        lastTime = 0;
      }
    };

    const kick = () => {
      dirty = true;
      if (!raf) {
        lastTime = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    const onScroll = () => kick();
    const onResize = () => {
      measure();
      kick();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    measure();
    kick();

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver === "function") {
      ro = new ResizeObserver(() => {
        measure();
        kick();
      });
      for (const card of cards) if (card) ro.observe(card);
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [items.length]);

  return (
    <div className={className}>
      {items.map((item, i) => (
        <Fragment key={i}>
          <div
            ref={(el) => {
              sentinelRefs.current[i] = el;
            }}
            aria-hidden
            style={{ height: 0 }}
          />
          <div
            ref={(el) => {
              cardRefs.current[i] = el;
              activeRefs.current[i] = false;
            }}
            className="sticky mb-[6vh] overflow-hidden rounded-2xl border-2 border-[#9a3412] bg-[#fff7ed] shadow-[0_12px_32px_rgba(120,53,15,0.25)] last:mb-0"
            style={{ top: `${VERT_MARGIN_VH}vh` }}
          >
            <img
              ref={(el) => {
                imgRefs.current[i] = el;
              }}
              src={item.image}
              alt={item.title ?? "Фото галереи ПГУ"}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
              className="block h-auto w-full"
              onLoad={() => {
                const img = imgRefs.current[i];
                if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
                  aspectRefs.current[i] = img.naturalWidth / img.naturalHeight;
                }
              }}
            />
            {item.title && (
              <span className="absolute bottom-3 left-3 rounded-md border border-[#9a3412]/60 bg-[#fff7ed]/90 px-2 py-1 text-xs font-semibold text-stone-800">
                {item.title}
              </span>
            )}
            </div>
          </Fragment>
      ))}
    </div>
  );
}
