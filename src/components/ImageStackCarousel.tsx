import { useCallback, useEffect, useRef, useState } from "react";

/**
 * ImageStackCarousel — «колода» фотографий в стиле SwipeCards.
 * Верхняя карточка тянется пальцем/мышью и улетает при свайпе,
 * открывая следующую; когда колода кончается — перемешивается заново.
 * Позади верхней карточки виден стек следующих фото.
 * Стиль — тот же пиксельный: кремовый фон, оранжевая рамка, жёсткая тень.
 *
 * Ключевая идея: карточки колоды — стабильные DOM-узлы (key = id карточки).
 * При сдвиге колоды меняется только transform, поэтому карточки плавно
 * «переползают» на новые позиции, а не пересоздаются. Раньше key был равен
 * src фотографии, из-за чего стек пересоздавался каждый раз — отсюда
 * дёрганная анимация.
 */

export type StackPhoto = { src: string; alt: string };

interface ImageStackCarouselProps {
  photos: StackPhoto[];
  /** Подпись под колодой */
  caption?: string;
}

const FLY_OUT_THRESHOLD = 72; // px, после которого карточка улетает
const FLY_OUT_MS = 280; // длительность анимации вылета
const MAX_VISIBLE = 3; // сколько карточек видно одновременно (верхняя + 2 за ней)
const DECK_SIZE = MAX_VISIBLE; // длина колоды
const DEPTH_STEP = 14; // px, насколько каждая следующая карточка ниже
const DEPTH_SCALE = 0.04; // насколько каждая следующая карточка меньше
const DECK_MS = 300; // переход между позициями в колоде

type Entry = { id: number; photoIndex: number };

export default function ImageStackCarousel({
  photos,
  caption,
}: ImageStackCarouselProps) {
  const n = photos.length;

  // Колода: Entry[] — сверху вниз. Первый элемент — верхняя карточка.
  const [deck, setDeck] = useState<Entry[]>(() =>
    Array.from({ length: DECK_SIZE }, (_, i) => ({ id: i, photoIndex: i })),
  );
  const deckRef = useRef(deck);
  deckRef.current = deck;
  const seqRef = useRef(DECK_SIZE);
  /** Сколько фотографий уже «выдано» колоде — источник фото для новых карточек */
  const consumedRef = useRef(DECK_SIZE);

  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  // Улетающая карточка: рендерится отдельно, пока летит
  const [flying, setFlying] = useState<{
    entry: Entry;
    dir: 1 | -1;
    from: number;
  } | null>(null);

  const pointerId = useRef<number | null>(null);
  const startX = useRef(0);
  const flyTimer = useRef(0);
  /** Живое смещение при перетаскивании — обновляем состояние не чаще
   *  одного раза за кадр, иначе на быстром свайпе React перерисовывает
   *  всю колоду на каждый pointermove */
  const dragRef = useRef(0);
  const dragRaf = useRef(0);

  const flyOut = useCallback(
    (dir: 1 | -1, from: number) => {
      const current = deckRef.current;
      if (current.length === 0) return;
      const top = current[0];
      const rest = current.slice(1);
      // Новая верхняя карточка должна встать ровно, а не остаться
      // смещённой/повёрнутой на величину последнего свайпа
      dragRef.current = 0;
      setDrag(0);
      const photoIndex = consumedRef.current % n;
      consumedRef.current += 1;
      const next: Entry = { id: seqRef.current++, photoIndex };
      setDeck([...rest, next]);
      setFlying({ entry: top, dir, from });
      // По истечении анимации вылета убираем уходящую из DOM
      window.clearTimeout(flyTimer.current);
      flyTimer.current = window.setTimeout(() => setFlying(null), FLY_OUT_MS + 60);
    },
    [n],
  );

  const reset = useCallback(() => {
    window.clearTimeout(flyTimer.current);
    setFlying(null);
    dragRef.current = 0;
    setDrag(0);
    consumedRef.current = DECK_SIZE;
    seqRef.current = DECK_SIZE;
    setDeck(
      Array.from({ length: DECK_SIZE }, (_, i) => ({ id: i, photoIndex: i })),
    );
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    pointerId.current = e.pointerId;
    startX.current = e.clientX;
    // страховка: новый жест всегда начинается из нулевого смещения
    dragRef.current = 0;
    setDrag(0);
    setDragging(true);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* указатель может быть уже неактивен — свайп всё равно обработается */
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointerId.current !== e.pointerId) return;
    dragRef.current = e.clientX - startX.current;
    if (!dragRaf.current) {
      dragRaf.current = requestAnimationFrame(() => {
        dragRaf.current = 0;
        setDrag(dragRef.current);
      });
    }
  };

  const endDrag = (e: React.PointerEvent) => {
    if (pointerId.current !== e.pointerId) return;
    pointerId.current = null;
    setDragging(false);
    const d = dragRef.current;
    if (Math.abs(d) > FLY_OUT_THRESHOLD) {
      flyOut(d > 0 ? 1 : -1, d);
    } else {
      dragRef.current = 0;
      setDrag(0);
    }
  };

  // Клавиатурное управление — фокус на контейнере
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") flyOut(1, 0);
    else if (e.key === "ArrowLeft") flyOut(-1, 0);
    else if (e.key === "Home") reset();
  };

  useEffect(
    () => () => {
      if (dragRaf.current) cancelAnimationFrame(dragRaf.current);
      window.clearTimeout(flyTimer.current);
    },
    [],
  );

  if (n === 0) return null;

  const top = deck[0];
  const topPhotoNo = (top.photoIndex % n) + 1;

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
        {/* Колода. Все карточки — стабильные DOM-узлы, меняется только
            transform: карточки плавно переползают на новую глубину. */}
        {deck.map((entry, i) => {
          const depth = i; // 0 — верхняя
          const photo = photos[entry.photoIndex % n];
          const isTop = i === 0;
          return (
            <div
              key={entry.id}
              aria-hidden={!isTop}
              data-testid={isTop ? "club-photo-top" : undefined}
              className={
                isTop
                  ? "absolute inset-x-2 top-0 cursor-grab active:cursor-grabbing"
                  : "absolute inset-x-2 top-0"
              }
              style={{
                height: 300,
                zIndex: 10 - depth,
                transformOrigin: "top center",
                transform: isTop
                  ? `translate3d(${drag}px, 0, 0) rotate(${drag * 0.06}deg)`
                  : `translate3d(0, ${depth * DEPTH_STEP}px, 0) scale(${1 - depth * DEPTH_SCALE})`,
                transition: dragging
                  ? "none"
                  : `transform ${DECK_MS}ms cubic-bezier(0.22,1,0.36,1)`,
                willChange: isTop && dragging ? "transform" : undefined,
              }}
              onPointerDown={isTop ? onPointerDown : undefined}
              onPointerMove={isTop ? onPointerMove : undefined}
              onPointerUp={isTop ? endDrag : undefined}
              onPointerCancel={isTop ? endDrag : undefined}
            >
              <PhotoCard
                src={photo.src}
                alt={isTop ? photo.alt : ""}
                eager={isTop}
              />
              {isTop ? (
                <span className="absolute right-2 top-2 border-2 border-[#9a3412] bg-[#fffaf2] px-2 py-0.5 text-xs font-semibold text-[#9a3412]">
                  {topPhotoNo}/{n}
                </span>
              ) : null}
            </div>
          );
        })}

        {/* Улетающая карточка. Анимация — CSS keyframes, чтобы она стартовала
            ровно из места, откуда её отпустили (без «прыжка»). */}
        {flying ? (
          <div
            key={`fly-${flying.entry.id}`}
            className="pointer-events-none absolute inset-x-2 top-0"
            style={
              {
                height: 300,
                zIndex: 20,
                transformOrigin: "top center",
                "--fly-from": `${flying.from}px`,
                animation: `stack-fly-${flying.dir > 0 ? "right" : "left"} ${FLY_OUT_MS}ms cubic-bezier(0.22,1,0.36,1) forwards`,
              } as React.CSSProperties
            }
          >
            <PhotoCard
              src={photos[flying.entry.photoIndex % n].src}
              alt=""
            />
            <span className="absolute right-2 top-2 border-2 border-[#9a3412] bg-[#fffaf2] px-2 py-0.5 text-xs font-semibold text-[#9a3412]">
              {(flying.entry.photoIndex % n) + 1}/{n}
            </span>
          </div>
        ) : null}
      </div>

      <figcaption className="text-center text-xs font-medium text-stone-500">
        {caption ?? "Свайпни фото в сторону, чтобы листать"}
      </figcaption>
    </figure>
  );
}

function PhotoCard({
  src,
  alt,
  eager = false,
}: {
  src: string;
  alt: string;
  eager?: boolean;
}) {
  return (
    <div
      className="h-full w-full overflow-hidden border-4 border-[#9a3412] bg-[#fffaf2] origin-center"
      style={{ boxShadow: "6px 6px 0 #b45309" }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        decoding="async"
        loading={eager ? "eager" : "lazy"}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
