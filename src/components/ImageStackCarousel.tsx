import { useCallback, useEffect, useRef, useState } from "react";

/**
 * ImageStackCarousel — «колода» фотографий в стиле SwipeCards.
 * Верхняя карточка тянется пальцем/мышью и улетает при свайпе,
 * открывая следующую; когда колода кончается — перемешивается заново.
 * Позади верхней карточки виден стек следующих фото.
 * Стиль — тот же пиксельный: кремовый фон, оранжевая рамка, жёсткая тень.
 */

export type StackPhoto = { src: string; alt: string };

interface ImageStackCarouselProps {
  photos: StackPhoto[];
  /** Подпись под колодой */
  caption?: string;
}

const FLY_OUT_THRESHOLD = 80; // px, после которого карточка улетает
const FLY_OUT_MS = 260; // длительность анимации вылета
const MAX_VISIBLE = 3; // сколько карточек стека показываем

export default function ImageStackCarousel({
  photos,
  caption,
}: ImageStackCarouselProps) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  // dir + уникальный id вылета: рендерим УХОДЯЩУЮ карточку отдельно,
  // пока идёт анимация, а верхнюю сразу сменяем на следующую
  const [flying, setFlying] = useState<{ dir: 0 | -1 | 1; id: number } | null>(
    null,
  );
  const pointerId = useRef<number | null>(null);
  const startX = useRef(0);
  const flySeq = useRef(0);

  const n = photos.length;

  const flyOut = useCallback(
    (dir: 0 | -1 | 1) => {
      setFlying({ dir, id: ++flySeq.current });
      // Верхнюю карточку сменяем сразу: новая появляется из стека, старая
      // дорисовывается отдельно (flying) и улетает. Уходящая = предыдущий
      // index, т.к. index уже сдвинулся. drag сбрасываем немедленно — иначе
      // новая верхняя карточка останется смещённой на ширину свайпа
      setDrag(0);
      setIndex((i) => (i + 1) % n);
      // По истечении анимации вылета убираем уходящую из DOM
      window.setTimeout(() => setFlying(null), FLY_OUT_MS + 20);
    },
    [n],
  );

  const reset = useCallback(() => {
    setFlying(null);
    setDrag(0);
    setIndex(0);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (flying) return;
    pointerId.current = e.pointerId;
    startX.current = e.clientX;
    // страховка: новый жест всегда начинается из нулевого смещения
    setDrag(0);
    setDragging(true);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* указатель может быть уже неактивен — свайп всё равно обработается */
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointerId.current !== e.pointerId || flying) return;
    setDrag(e.clientX - startX.current);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (pointerId.current !== e.pointerId) return;
    pointerId.current = null;
    setDragging(false);
    if (Math.abs(drag) > FLY_OUT_THRESHOLD) {
      flyOut(drag > 0 ? 1 : -1);
    } else {
      setDrag(0);
    }
  };

  // Клавиатурное управление — фокус на контейнере
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (flying) return;
    if (e.key === "ArrowRight") flyOut(1);
    else if (e.key === "ArrowLeft") flyOut(-1);
    else if (e.key === "Home") reset();
  };

  useEffect(() => {
    if (index >= n) setIndex(0);
  }, [n, index]);

  if (n === 0) return null;

  const visibleCount = Math.min(MAX_VISIBLE, n);

  return (
    <figure className="m-0 flex flex-col items-center gap-2">
      <div
        role="group"
        aria-roledescription="карусель"
        aria-label="Фотографии клуба"
        tabIndex={0}
        onKeyDown={onKeyDown}
        data-testid="club-photo-stack"
        className="relative w-full touch-pan-y select-none"
        style={{ height: 340 }}
      >
        {/* Стек позади — от дальней к ближней, чтобы верхняя перекрывала.
            Карточки сдвинуты вниз и чуть сужены. key = фото, а не index:
            при смене index карточки НЕ пересоздаются, а плавно
            перезаползают на новые позиции (scale/top) через transition */}
        {Array.from({ length: visibleCount }, (_, k) => visibleCount - 1 - k)
          .filter((k) => k > 0)
          .map((k) => {
            const p = photos[(index + k) % n];
            return (
              <div
                key={p.src}
                aria-hidden
                className="absolute inset-x-6"
                style={{
                  top: k * 14,
                  height: 300,
                  transform: `scale(${1 - k * 0.04})`,
                  transition:
                    "transform 300ms cubic-bezier(0.22,1,0.36,1), top 300ms cubic-bezier(0.22,1,0.36,1)",
                  zIndex: 10 - k,
                }}
              >
                <PhotoCard src={p.src} alt="" />
              </div>
            );
          })}

        {/* Уходящая карточка: рендерится отдельно, пока летит, и не мешает
            смене верхней. Всё в том же стиле */}
        {flying && (
          <div
            key={`fly-${flying.id}`}
            className="pointer-events-none absolute inset-x-2 top-0"
            style={{
              height: 300,
              zIndex: 20,
              transform: `translateX(${flying.dir * 140}%) rotate(${flying.dir * 14}deg)`,
              transition: `transform ${FLY_OUT_MS}ms cubic-bezier(0.22,1,0.36,1)`,
              opacity: 0.9,
            }}
          >
            <PhotoCard
              src={photos[(index - 1 + n) % n].src}
              alt=""
            />
            <span className="absolute right-2 top-2 border-2 border-[#9a3412] bg-[#fffaf2] px-2 py-0.5 text-xs font-semibold text-[#9a3412]">
              {((index - 1 + n) % n) + 1}/{n}
            </span>
          </div>
        )}

        {/* Верхняя карточка — сразу следующая, появляется из стека.
            Без анимации вылета на ней: transform всегда от нуля */}
        <div
          className="absolute inset-x-2 top-0 mx-auto cursor-grab active:cursor-grabbing"
          data-testid="club-photo-top"
          style={{
            height: 300,
            zIndex: 10,
            // пока уходит предыдущая карточка — верхняя всегда в нуле:
            // даже если состояние drag не успело сброситься, новая
            // карточка не «зависнет» смещённой на ширину свайпа
            transform: flying
              ? "translateX(0px) rotate(0deg)"
              : `translateX(${drag}px) rotate(${drag * 0.06}deg)`,
            transition: dragging
              ? "none"
              : "transform 260ms cubic-bezier(0.22,1,0.36,1)",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <PhotoCard src={photos[index].src} alt={photos[index].alt} />
          {/* Счётчик поверх фото */}
          <span className="absolute right-2 top-2 border-2 border-[#9a3412] bg-[#fffaf2] px-2 py-0.5 text-xs font-semibold text-[#9a3412]">
            {index + 1}/{n}
          </span>
        </div>
      </div>

      <figcaption className="text-center text-xs font-medium text-stone-500">
        {caption ?? "Свайпни фото в сторону, чтобы листать"}
      </figcaption>
    </figure>
  );
}

function PhotoCard({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      className="h-full w-full overflow-hidden border-4 border-[#9a3412] bg-[#fffaf2] origin-center"
      style={{ boxShadow: "6px 6px 0 #b45309" }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
