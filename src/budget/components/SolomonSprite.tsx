import { useEffect, useRef } from "react";
import pose03 from "../../assets/squirrel/sprites/pose-03.png";
import pose1_0 from "../../assets/squirrel/sprites/pose-1_0.png";
import pose1_1 from "../../assets/squirrel/sprites/pose-1_1.png";
import pose1_2 from "../../assets/squirrel/sprites/pose-1_2.png";
import pose2_0 from "../../assets/squirrel/sprites/pose-2_0.png";
import pose2_1 from "../../assets/squirrel/sprites/pose-2_1.png";
import pose2_2 from "../../assets/squirrel/sprites/pose-2_2.png";
import pose4_0 from "../../assets/squirrel/sprites/pose-4_0.png";
import pose4_1 from "../../assets/squirrel/sprites/pose-4_1.png";
import pose4_2 from "../../assets/squirrel/sprites/pose-4_2.png";
import pose5_0 from "../../assets/squirrel/sprites/pose-5_0.png";
import pose5_1 from "../../assets/squirrel/sprites/pose-5_1.png";
import pose5_2 from "../../assets/squirrel/sprites/pose-5_2.png";
import pose6_0 from "../../assets/squirrel/sprites/pose-6_0.png";
import pose6_1 from "../../assets/squirrel/sprites/pose-6_1.png";
import pose6_2 from "../../assets/squirrel/sprites/pose-6_2.png";
import pose7_0 from "../../assets/squirrel/sprites/pose-7_0.png";
import pose7_1 from "../../assets/squirrel/sprites/pose-7_1.png";
import pose7_2 from "../../assets/squirrel/sprites/pose-7_2.png";
import pose8_0 from "../../assets/squirrel/sprites/pose-8_0.png";
import pose8_1 from "../../assets/squirrel/sprites/pose-8_1.png";
import pose8_2 from "../../assets/squirrel/sprites/pose-8_2.png";
import pose9_0 from "../../assets/squirrel/sprites/pose-9_0.png";
import pose9_1 from "../../assets/squirrel/sprites/pose-9_1.png";
import pose9_2 from "../../assets/squirrel/sprites/pose-9_2.png";
import pose10_0 from "../../assets/squirrel/sprites/pose-10_0.png";
import pose10_1 from "../../assets/squirrel/sprites/pose-10_1.png";
import pose10_2 from "../../assets/squirrel/sprites/pose-10_2.png";

/**
 * Соломон на Canvas.
 *
 * Спрайты лежат в `src/assets/squirrel/sprites/` — это подготовленные
 * `scripts/prepare_assets.py` версии присланного арта: все позы приведены
 * к общему холсту 300×340 и одному масштабу, чтобы переключение варианта
 * загрязнения не «прыгало».
 *
 * Имя файла — `pose-<поза>_<загрязнение>.png`, где загрязнение:
 *   0 — чистый, 1 — слегка грязный, 2 — сильно грязный
 * (так описано в `assets/squirrel/пояснялка по поводу имён.md`).
 *
 * Поза выбирается по настроению Соломона, вариант — по его чистоте:
 *
 *   ≥ 75 → радость (3)      ≥ 50 → нейтральная (1)
 *   ≥ 25 → обычные (2, 4, 5, 8, 9, 10)   < 25 → грусть (7)
 *   сон (6) — когда хозяин спит
 *
 * Позы 3 в новом наборе нет (только чистый вариант из старого арта), поэтому
 * грязный радостный Соломон рисуется позой 10 — она есть во всех трёх
 * вариантах загрязнения.
 *
 * Изображение рисуется с `imageSmoothingEnabled = false`, чтобы сохранить
 * пиксельную чёткость при масштабировании.
 */

/**
 * Спрайты импортируются статически: так сборщик точно кладёт их в бандл и в
 * офлайн-кэш. Динамический `new URL(..., import.meta.url)` Vite не анализирует.
 */
const SPRITES: Record<string, string> = {
  "3": pose03,
  "1_0": pose1_0, "1_1": pose1_1, "1_2": pose1_2,
  "2_0": pose2_0, "2_1": pose2_1, "2_2": pose2_2,
  "4_0": pose4_0, "4_1": pose4_1, "4_2": pose4_2,
  "5_0": pose5_0, "5_1": pose5_1, "5_2": pose5_2,
  "6_0": pose6_0, "6_1": pose6_1, "6_2": pose6_2,
  "7_0": pose7_0, "7_1": pose7_1, "7_2": pose7_2,
  "8_0": pose8_0, "8_1": pose8_1, "8_2": pose8_2,
  "9_0": pose9_0, "9_1": pose9_1, "9_2": pose9_2,
  "10_0": pose10_0, "10_1": pose10_1, "10_2": pose10_2,
};

/** Позы, которые встречаются в «обычном» настроении. */
const ORDINARY_POSES = ["2", "4", "5", "8", "9", "10"];

/**
 * Поза по настроению Соломона — без учёта загрязнения.
 *
 * Значение выбирается один раз на «настроенческий» уровень и не меняется
 * от кадра к кадру: иначе «обычная» поза пере скакивала бы при любой
 * перерисовке.
 */
export function poseForMood(solomon: number): string {
  if (solomon >= 75) return "3";
  if (solomon >= 50) return "1";
  if (solomon >= 25) {
    return ORDINARY_POSES[Math.floor(Math.random() * ORDINARY_POSES.length)];
  }
  return "7";
}

/** Уровень настроения, из которого выбирается поза. */
function moodBucket(solomon: number): "joy" | "neutral" | "ordinary" | "sad" {
  if (solomon >= 75) return "joy";
  if (solomon >= 50) return "neutral";
  if (solomon >= 25) return "ordinary";
  return "sad";
}

/**
 * Ключ спрайта: поза и вариант загрязнения.
 *
 * `dirt` — 0 (чистый), 1 (слегка грязный), 2 (сильно грязный). Границы
 * те же, что в `core/mood.ts` и в эталоне `scripts/balance_sim.py`.
 */
export function spriteKey(
  solomon: number,
  dirt: 0 | 1 | 2,
  sleeping: boolean,
  basePose?: string,
): string {
  if (sleeping) return `6_${dirt}`;
  const pose = basePose ?? poseForMood(solomon);
  // Поза 3 есть только в чистом варианте: грязного радостного нет.
  if (pose === "3" && dirt > 0) return `10_${dirt}`;
  return `${pose}_${dirt}`;
}

type Props = {
  /** Настроение Соломона, 0…100. */
  mood: number;
  /** Чистота Соломона, 0…100 (100 — только что вымыт). */
  cleanliness?: number;
  /** Спит ли хозяин (поза сна). */
  sleeping?: boolean;
  /** Высота холста в CSS-пикселях. */
  height?: number;
  className?: string;
};

export default function SolomonSprite({
  mood,
  cleanliness = 100,
  sleeping = false,
  height = 260,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const keyRef = useRef<string>("");
  // Поза держится между перерисовками: «обычная» поза не должна
  // перескакивать каждую секунду.
  const poseRef = useRef<string>(poseForMood(mood));
  const bucketRef = useRef<string>(moodBucket(mood));

  useEffect(() => {
    const bucket = moodBucket(mood);
    if (bucket !== bucketRef.current) {
      bucketRef.current = bucket;
      poseRef.current = poseForMood(mood);
    }

    const dirt = dirtFromCleanliness(cleanliness);
    const key = spriteKey(mood, dirt, sleeping, poseRef.current);
    if (key === keyRef.current && imageRef.current?.complete) {
      draw(canvasRef.current, imageRef.current);
      return;
    }
    keyRef.current = key;

    const image = new Image();
    image.src = SPRITES[key];
    image.onload = () => {
      imageRef.current = image;
      draw(canvasRef.current, image);
    };
  }, [mood, cleanliness, sleeping]);

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

/**
 * Вариант загрязнения по шкале чистоты.
 *
 * Дублирует `core/mood.ts` намеренно: компонент не должен тянуть игровое
 * ядро, а правило границ одно и то же — проверяется тестом.
 */
export function dirtFromCleanliness(cleanliness: number): 0 | 1 | 2 {
  if (cleanliness >= 67) return 0;
  if (cleanliness > 33) return 1;
  return 2;
}

/** Подпись состояния загрязнения — для интерфейса. */
export function dirtLabel(cleanliness: number): string {
  switch (dirtFromCleanliness(cleanliness)) {
    case 0:
      return "чистый";
    case 1:
      return "слегка грязный";
    default:
      return "сильно грязный";
  }
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
