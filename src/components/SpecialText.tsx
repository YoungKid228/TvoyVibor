import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

/**
 * SpecialText — заголовок в фирменном шрифте (Minecraft) со scramble-эффектом
 * (по образцу Spell UI Special Text): текст «расшифровывается» из случайных
 * символов слева направо. Доступный заголовок остаётся настоящим <h*>
 * (по нему ищут тесты), scramble-слой скрыт от скринридеров.
 */

type SpecialTextProps = {
  children: string;
  /** HTML-тег для доступного заголовка (по умолчанию h2) */
  as?: "h1" | "h2" | "h3";
  /** Задержка старта, мс */
  delay?: number;
  /** Скорость: мс на один «шаг» расшифровки (символ за шаг) */
  speed?: number;
  className?: string;
  style?: CSSProperties;
};

/** Пул символов-«помех» — техно-набор в духе пиксельной темы */
const SCRAMBLE_CHARS = "!<>-_\\/[]{}—=+*^?#01";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function randomChar() {
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
}

export default function SpecialText({
  children,
  as: Tag = "h2",
  delay = 0,
  speed = 30,
  className,
  style,
}: SpecialTextProps) {
  const text = Array.from(children);
  const [resolved, setResolved] = useState(0);
  const [tick, setTick] = useState(0);

  const reduced =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches;

  useEffect(() => {
    if (reduced) {
      setResolved(text.length);
      return;
    }
    setResolved(0);
    let interval: number | undefined;
    const timeout = window.setTimeout(() => {
      interval = window.setInterval(() => {
        setTick((t) => t + 1);
        setResolved((r) => {
          if (r >= text.length) {
            if (interval !== undefined) window.clearInterval(interval);
            return r;
          }
          return r + 1;
        });
      }, Math.max(10, speed));
    }, delay);
    return () => {
      window.clearTimeout(timeout);
      if (interval !== undefined) window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children, reduced]);

  // Пока эффект не завершён, нерасшифрованные символы — случайные;
  // tick заставляет их «мерцать» на каждом шаге
  const display =
    resolved >= text.length
      ? text
      : text.map((ch, i) => (i < resolved || ch === " " ? ch : randomChar()));

  return (
    <Tag className={className} style={style} aria-label={children}>
      <span aria-hidden data-testid="special-text-scramble" data-tick={tick}>
        {display.map((ch, i) => (
          <span key={i}>{ch}</span>
        ))}
      </span>
    </Tag>
  );
}
