import { useEffect, useState } from "react";

/**
 * Всплывающее уведомление.
 *
 * Отказы («уже ночь, пора спать», «не хватает денег») раньше уезжали вниз
 * страницы — игрок их просто не видел. Теперь сообщение всплывает поверх
 * экрана и само исчезает через несколько секунд.
 *
 * Уведомление живёт над нижней навигацией: снизу экрана у игры полоса
 * разделов, и перекрывать её нельзя — игрок должен видеть, куда нажать.
 *
 * Показывается и успех (зелёным), и отказ (янтарным).
 */
type Props = {
  /** Что получилось. */
  message: string | null;
  /** Почему не получилось. */
  error: string | null;
};

/** Сколько секунд висит уведомление. */
const LIFETIME = 4000;

export default function Toast({ message, error }: Props) {
  const text = error ?? message;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!text) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), LIFETIME);
    return () => window.clearTimeout(timer);
  }, [text]);

  if (!text || !visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[86px] z-50 flex justify-center px-3"
    >
      <div
        className={`max-w-md rounded-lg border-2 px-3 py-2 text-sm font-medium shadow-[3px_3px_0_rgba(0,0,0,0.25)] ${
          error
            ? "border-amber-500 bg-amber-50 text-amber-900"
            : "border-emerald-600 bg-emerald-50 text-emerald-900"
        }`}
      >
        {text}
      </div>
    </div>
  );
}
