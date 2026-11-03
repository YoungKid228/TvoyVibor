import { useEffect, useRef } from "react";
import pose01 from "../../assets/squirrel/pose-01.png";
import pose02 from "../../assets/squirrel/pose-02.png";
import pose03 from "../../assets/squirrel/pose-03.png";
import pose04 from "../../assets/squirrel/pose-04.png";
import pose05 from "../../assets/squirrel/pose-05.png";
import pose06 from "../../assets/squirrel/pose-06.png";
import pose07 from "../../assets/squirrel/pose-07.png";
import pose08 from "../../assets/squirrel/pose-08.png";
import pose09 from "../../assets/squirrel/pose-09.png";
import pose10 from "../../assets/squirrel/pose-10.png";

/**
 * Соломон на Canvas.
 *
 * Спрайты лежат в `src/assets/squirrel/pose-01..10.png` — это присланный
 * арт персонажа, нарезанный из спрайт-листа. Поза выбирается по настроению
 * Соломона (см. раздел 13 документа `docs/Хермес-вариант.md`):
 *
 *   ≥ 75 → радость (3)      ≥ 50 → нейтральная (1)
 *   ≥ 25 → обычные (2, 4, 5, 8, 9, 10)   < 25 → грусть (7)
 *
 * Изображение рисуется с `imageSmoothingEnabled = false`, чтобы сохранить
 * пиксельную чёткость при масштабировании.
 */

/**
 * Спрайты импортируются статически: так сборщик точно кладёт их в бандл и в
 * офлайн-кэш. Динамический `new URL(..., import.meta.url)` Vite не анализирует.
 */
const POSES: Record<string, string> = {
  "pose-01": pose01,
  "pose-02": pose02,
  "pose-03": pose03,
  "pose-04": pose04,
  "pose-05": pose05,
  "pose-06": pose06,
  "pose-07": pose07,
  "pose-08": pose08,
  "pose-09": pose09,
  "pose-10": pose10,
};

/** Поза по настроению Соломона. */
export function poseForMood(solomon: number): string {
  if (solomon >= 75) return "pose-03";
  if (solomon >= 50) return "pose-01";
  if (solomon >= 25) {
    const ordinary = ["pose-02", "pose-04", "pose-05", "pose-08", "pose-09", "pose-10"];
    return ordinary[Math.floor(Math.random() * ordinary.length)];
  }
  return "pose-07";
}

type Props = {
  /** Настроение Соломона, 0…100. */
  mood: number;
  /** Спит ли хозяин (поза сна). */
  sleeping?: boolean;
  /** Высота холста в CSS-пикселях. */
  height?: number;
  className?: string;
};

export default function SolomonSprite({
  mood,
  sleeping = false,
  height = 260,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const poseRef = useRef<string>(sleeping ? "pose-06" : poseForMood(mood));

  // Спрайт перерисовывается при смене позы или настроения.
  useEffect(() => {
    const pose = sleeping ? "pose-06" : poseForMood(mood);
    if (pose === poseRef.current && imageRef.current?.complete) {
      draw(canvasRef.current, imageRef.current);
      return;
    }
    poseRef.current = pose;

    const image = new Image();
    image.src = POSES[pose];
    image.onload = () => {
      imageRef.current = image;
      draw(canvasRef.current, image);
    };
  }, [mood, sleeping]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      height={height}
      width={height}
      aria-label={`Соломон — ${sleeping ? "спит" : "ждёт"}`}
      role="img"
      style={{ imageRendering: "pixelated", maxWidth: "100%" }}
    />
  );
}

/** Отрисовать спрайт по центру холста, сохраняя пропорции. */
function draw(
  canvas: HTMLCanvasElement | null,
  image: HTMLImageElement | null,
): void {
  if (!canvas || !image) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const scale = Math.min(
    canvas.width / image.width,
    canvas.height / image.height,
  );
  const width = image.width * scale;
  const height = image.height * scale;
  ctx.drawImage(
    image,
    (canvas.width - width) / 2,
    canvas.height - height,
    width,
    height,
  );
}
