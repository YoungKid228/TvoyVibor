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
 * Последняя карточка не уходит (под ней нечего наезжает).
 *
 * Прогресс ухода считается по нулевому сентинелю перед карточкой:
 * getBoundingClientRect самой карточки искажается её же трансформацией.
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

export default function StickyCardStack({
  items,
  className,
}: StickyCardStackProps) {
  const sentinelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);

  useEffect(() => {
    const cards = cardRefs.current;
    const sentinels = sentinelRefs.current;
    if (!cards.length) return;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const lastP = new Array<number>(cards.length).fill(-1);
    const targetP = new Array<number>(cards.length).fill(-1);
    let applyRaf = 0;
    let tickRaf = 0;

    const draw = (i: number, p: number) => {
      const el = cards[i];
      const img = imgRefs.current[i];
      if (!el) return;
      const rot = p * MAX_ROT_DEG;
      const scale = 1 - 0.92 * p;
      el.style.transform =
        p > 0
          ? `scale(${scale.toFixed(4)}) rotate(${rot.toFixed(2)}deg)`
          : "";
      // Затухание: уменьшенная карточка не должна маячить на заднем плане,
      // пока следующая ещё в пути.
      el.style.opacity = p > 0 ? (1 - p).toFixed(3) : "";
      if (img) {
        if (p > 0) {
          // Компенсирующий поворот + масштаб, чтобы повёрнутое фото
          // накрывало кадр целиком (иначе в углах виден фон карточки).
          const rad = (rot * Math.PI) / 180;
          const aspect =
            img.offsetWidth > 0 && img.offsetHeight > 0
              ? img.offsetWidth / img.offsetHeight
              : 1.4;
          const cover = Math.max(
            Math.cos(rad) + Math.sin(rad) / aspect,
            Math.cos(rad) + Math.sin(rad) * aspect
          );
          img.style.transform = `rotate(${(-rot).toFixed(2)}deg) scale(${cover.toFixed(4)})`;
        } else {
          img.style.transform = "";
        }
      }
    };

    // Плавное приближение к целевому прогрессу (аналог пружины в оригинале).
    const tick = () => {
      let moving = false;
      for (let i = 0; i < cards.length - 1; i++) {
        const target = targetP[i];
        if (target < 0) continue;
        const cur = lastP[i] < 0 ? target : lastP[i];
        const next = cur + (target - cur) * 0.22;
        const settled = Math.abs(target - next) < 0.001;
        const p = settled ? target : next;
        if (p !== lastP[i]) {
          lastP[i] = p;
          draw(i, p);
        }
        if (!settled) moving = true;
        else targetP[i] = -1;
      }
      if (moving) tickRaf = requestAnimationFrame(tick);
      else tickRaf = 0;
    };

    const apply = () => {
      applyRaf = 0;
      const vh = window.innerHeight;
      if (vh < 1) return;
      const stickyTop = (VERT_MARGIN_VH / 100) * vh;
      let pending = false;
      for (let i = 0; i < cards.length - 1; i++) {
        const sent = sentinels[i];
        const el = cards[i];
        if (!sent || !el) continue;
        // Карточка залипает, когда сентинель доходит до линии stickyTop;
        // дальше прогресс — сколько экранов «высоты карточки» прокручено.
        const p = Math.min(
          1,
          Math.max(0, (stickyTop - sent.getBoundingClientRect().top) /
            Math.max(1, (el.offsetHeight + vh * 0.06) * 0.9))
        );
        if (p === lastP[i]) continue;
        targetP[i] = p;
        pending = true;
      }
      // tick-цикл сам подхватит новые targetP, если уже работает.
      if (pending && !tickRaf) tickRaf = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      if (!applyRaf) applyRaf = requestAnimationFrame(apply);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    apply();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (applyRaf) cancelAnimationFrame(applyRaf);
      if (tickRaf) cancelAnimationFrame(tickRaf);
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
            }}
            className="sticky mb-[6vh] overflow-hidden rounded-2xl border-2 border-[#9a3412] bg-[#fff7ed] shadow-[0_12px_32px_rgba(120,53,15,0.25)] last:mb-0"
            style={{
              top: `${VERT_MARGIN_VH}vh`,
              willChange: "transform",
            }}
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
              style={{ willChange: "transform" }}
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
