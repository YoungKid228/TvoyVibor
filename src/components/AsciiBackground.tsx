import { useEffect, useRef } from "react";

export type AsciiPostEffect = { enabled: boolean; intensity: number };

type PostEffects = {
  scanLines?: AsciiPostEffect;
  vignette?: AsciiPostEffect;
  bloom?: AsciiPostEffect;
  glitch?: AsciiPostEffect;
  filmGrain?: AsciiPostEffect;
};

type AsciiBackgroundProps = {
  className?: string;
  /** Размер ячейки «вокселя» в CSS-пикселях */
  cellSize?: number;
  /** -255…255 */
  brightness?: number;
  /** %, 100 — без изменения */
  contrast?: number;
  /** 0–100, усиление границ яркости */
  edgeEmphasis?: number;
  /** 0–100, скорость анимации (shimmer) */
  animSpeed?: number;
  /** 0–100, глубина анимации (shimmer) */
  animIntensity?: number;
  backgroundColor?: string;
  tint?: string;
  tintOpacity?: number;
  /**
   * Фото-источник эффекта. Рисуется поверх процедурного фона
   * (градиент + световые пятна + шум).
   */
  src?: string;
  /** Как вписать источник: cover — заполнить с кадрированием (по умолчанию),
   * contain — целиком, по центру (для эмблем/логотипов в узких полосах) */
  fit?: "cover" | "contain";
  /** Множитель размера источника поверх fit: >1 — крупнее (край можно
   * обрезать), <1 — мельче. Работает и в contain, и в cover */
  imageScale?: number;
  /** Смещение источника по горизонтали, доля ширины контейнера:
   * 0 — по центру, >0 — вправо, <0 — влево */
  imageOffsetX?: number;
  /** Рисовать ли процедурный фон (градиент/пятна/шум) под источником.
   * false — источник рисуется на прозрачном холсте (для наложения
   * поверх другого слоя AsciiBackground) */
  proceduralBg?: boolean;
  postEffects?: PostEffects;
};

const DEFAULT_POST: Required<PostEffects> = {
  scanLines: { enabled: true, intensity: 40 },
  vignette: { enabled: true, intensity: 38 },
  bloom: { enabled: true, intensity: 25 },
  glitch: { enabled: true, intensity: 20 },
  filmGrain: { enabled: true, intensity: 30 },
};

const GRAIN_TILE_SIZE = 96;

/** Допуск цвета при удалении фона картинки (евклидово RGB-расстояние):
 * пиксели, связанные с рамкой и близкие к её среднему цвету, становятся
 * прозрачными — светлый фон картинки сливается с тёмным фоном эффекта,
 * а белые части герба внутри не затрагиваются */
const IMAGE_BG_TOLERANCE = 42;

/**
 * Удаляет фон картинки: заливка от краёв (flood fill) от всех граничных
 * пикселей в пределах допуска от среднего цвета рамки. Возвращает канвас
 * с прозрачным фоном либо null (нет 2d-контекста / ошибка чтения пикселей).
 */
function removeImageBackground(img: HTMLImageElement): HTMLCanvasElement | null {
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
    const w = c.width;
    const h = c.height;

    // Средний цвет рамки картинки
    let sr = 0;
    let sg = 0;
    let sb = 0;
    let n = 0;
    const sample = (i: number) => {
      sr += px[i];
      sg += px[i + 1];
      sb += px[i + 2];
      n++;
    };
    for (let x = 0; x < w; x++) {
      sample(x * 4);
      sample(((h - 1) * w + x) * 4);
    }
    for (let y = 0; y < h; y++) {
      sample(y * w * 4);
      sample((y * w + w - 1) * 4);
    }
    const br = sr / n;
    const bgc = sg / n;
    const bb = sb / n;
    const tol2 = IMAGE_BG_TOLERANCE * IMAGE_BG_TOLERANCE;
    const isBg = (i: number) => {
      const dr = px[i] - br;
      const dg = px[i + 1] - bgc;
      const db = px[i + 2] - bb;
      return dr * dr + dg * dg + db * db <= tol2;
    };

    // Flood fill от краёв: прозрачными становятся только пиксели,
    // связанные с рамкой — замкнутые светлые области внутри герба целы
    const visited = new Uint8Array(w * h);
    const stack: number[] = [];
    const pushIfBg = (x: number, y: number) => {
      const p = y * w + x;
      if (!visited[p] && isBg(p * 4)) {
        visited[p] = 1;
        stack.push(p);
      }
    };
    for (let x = 0; x < w; x++) {
      pushIfBg(x, 0);
      pushIfBg(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      pushIfBg(0, y);
      pushIfBg(w - 1, y);
    }
    while (stack.length > 0) {
      const p = stack.pop() as number;
      px[p * 4 + 3] = 0;
      const x = p % w;
      const y = (p / w) | 0;
      if (x > 0) pushIfBg(x - 1, y);
      if (x < w - 1) pushIfBg(x + 1, y);
      if (y > 0) pushIfBg(x, y - 1);
      if (y < h - 1) pushIfBg(x, y + 1);
    }

    g.putImageData(data, 0, 0);
    return c;
  } catch {
    return null; // jsdom/тесты или запрет чтения пикселей — рисуем как есть
  }
}

/**
 * Фон «ASCII-art / voxel» по образцу 21st.dev (эффект Harmal Singh),
 * Canvas2D: сетка ячеек, сэмплинг яркости источника, режим voxel,
 * анимация shimmer и постэффекты (scanLines, vignette, bloom,
 * glitch, filmGrain) из включённых в конфигурации.
 * Все вычисления — вне React state; кадр рисуется императивно.
 */
export default function AsciiBackground({
  className,
  cellSize = 4,
  brightness = -23,
  contrast = 115,
  edgeEmphasis = 86,
  animSpeed = 32,
  animIntensity = 36,
  backgroundColor = "#160a04",
  tint = "#f97316",
  tintOpacity = 0.25,
  src,
  fit = "cover",
  imageScale = 1,
  imageOffsetX = 0,
  proceduralBg = true,
  postEffects,
}: AsciiBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvasEl = canvasRef.current;
    if (!container || !canvasEl) return;
    let baseCtx: CanvasRenderingContext2D | null = null;
    try {
      baseCtx = canvasEl.getContext("2d");
    } catch {
      return; // jsdom/тесты: canvas не реализован
    }
    if (!baseCtx) return; // поддержка 2D отключена
    const canvas: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = baseCtx;

    const pfx = { ...DEFAULT_POST, ...postEffects };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hasRaf = typeof window.requestAnimationFrame === "function";

    const scene = document.createElement("canvas");
    const sceneCtxBase = scene.getContext("2d");
    const source = document.createElement("canvas");
    const sourceCtxBase = source.getContext("2d");
    const sampler = document.createElement("canvas");
    const samplerCtxBase = sampler.getContext("2d");
    if (!sceneCtxBase || !sourceCtxBase || !samplerCtxBase) return;
    const sceneCtx: CanvasRenderingContext2D = sceneCtxBase;
    const sourceCtx: CanvasRenderingContext2D = sourceCtxBase;
    const samplerCtx: CanvasRenderingContext2D = samplerCtxBase;

    let cssW = 0;
    let cssH = 0;
    let cols = 0;
    let rows = 0;
    let raf = 0;
    let running = false;
    let disposed = false;
    let image: HTMLImageElement | null = null;
    let imageReady = false;
    let prepared: HTMLCanvasElement | null = null;
    let grainPattern: CanvasPattern | null = null;

    let lum = new Float32Array(0);
    let rgb = new Float32Array(0);
    let phase = new Float32Array(0);
    let vignetteGrad: CanvasGradient | null = null;
    let scanPattern: CanvasPattern | null = null;

    function drawBox(
      g: CanvasRenderingContext2D,
      x: number,
      y: number,
      s: number,
    ) {
      g.beginPath();
      const extended = g as CanvasRenderingContext2D & {
        roundRect?: (x: number, y: number, w: number, h: number, r: number) => void;
      };
      if (typeof extended.roundRect === "function") {
        extended.roundRect(x, y, s, s, Math.min(2, s * 0.3));
      } else {
        g.rect(x, y, s, s);
      }
      g.fill();
    }

    function buildGrainTile(): HTMLCanvasElement | null {
      const tile = document.createElement("canvas");
      tile.width = GRAIN_TILE_SIZE;
      tile.height = GRAIN_TILE_SIZE;
      const tctx = tile.getContext("2d");
      if (!tctx) return null;
      const img = tctx.createImageData(GRAIN_TILE_SIZE, GRAIN_TILE_SIZE);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        img.data[i] = v;
        img.data[i + 1] = v;
        img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      tctx.putImageData(img, 0, 0);
      return tile;
    }

    function buildProceduralSource(w: number, h: number) {
      const g: CanvasRenderingContext2D = sourceCtx;
      const grad = g.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#5b2f16");
      grad.addColorStop(1, "#3a1c0c");
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);

      const blobs: Array<[number, number, number, string]> = [
        [0.22, 0.35, 0.55, "rgba(251, 146, 60, 0.65)"],
        [0.72, 0.75, 0.65, "rgba(234, 88, 12, 0.70)"],
        [0.55, 0.15, 0.35, "rgba(253, 186, 116, 0.50)"],
      ];
      for (const [bx, by, br, color] of blobs) {
        const radius = br * Math.max(w, h);
        const rg = g.createRadialGradient(bx * w, by * h, 0, bx * w, by * h, radius);
        rg.addColorStop(0, color);
        rg.addColorStop(1, "rgba(0, 0, 0, 0)");
        g.fillStyle = rg;
        g.fillRect(0, 0, w, h);
      }

      for (let i = 0; i < (w * h) / 20; i++) {
        g.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.15})`;
        g.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }
    }

    function drawSource() {
      if (!proceduralBg) {
        // Только источник на прозрачном холсте: слой накладывается
        // поверх другого AsciiBackground, свой фон не нужен
        sourceCtx.clearRect(0, 0, source.width, source.height);
      } else {
        // Процедурный фон рисуется всегда: вокруг фото/логотипа остаются
        // градиент, световые пятна и шум, а не плоская заливка
        buildProceduralSource(source.width, source.height);
      }
      if (image && imageReady) {
        const img: HTMLImageElement | HTMLCanvasElement = prepared ?? image;
        const iw = img.width;
        const ih = img.height;
        if (iw > 0 && ih > 0) {
          const scale =
            (fit === "contain"
              ? Math.min(source.width / iw, source.height / ih)
              : Math.max(source.width / iw, source.height / ih)) * imageScale;
          const offsetX = (imageOffsetX ?? 0) * source.width;
          if (fit === "contain") {
            // Целиком, смещаемо по горизонтали: эмблема не обрезается
            const dw = iw * scale;
            const dh = ih * scale;
            sourceCtx.drawImage(
              img,
              (source.width - dw) / 2 + offsetX,
              (source.height - dh) / 2,
              dw,
              dh,
            );
          } else {
            // Заполнить с кадрированием по центру (как cover в CSS)
            const sw = source.width / scale;
            const sh = source.height / scale;
            sourceCtx.drawImage(
              img,
              (iw - sw) / 2,
              (ih - sh) / 2,
              sw,
              sh,
              0,
              0,
              source.width,
              source.height,
            );
          }
        }
      }
    }

    function rebuild() {
      cssW = canvas.clientWidth;
      cssH = canvas.clientHeight;
      if (cssW < 2 || cssH < 2) return;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      scene.width = canvas.width;
      scene.height = canvas.height;
      source.width = Math.round(cssW);
      source.height = Math.round(cssH);

      cols = Math.max(1, Math.round(cssW / cellSize));
      rows = Math.max(1, Math.round(cssH / cellSize));
      sampler.width = cols;
      sampler.height = rows;

      drawSource();
      samplerCtx.drawImage(source, 0, 0, cols, rows);
      const data = samplerCtx.getImageData(0, 0, cols, rows).data;
      const n = cols * rows;
      lum = new Float32Array(n);
      rgb = new Float32Array(n * 3);
      phase = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        // Альфа ячейки: на антиалиасинговых краях букв цвет смешан с
        // прозрачностью и без учёта альфы даёт белые/жёлтые/красные
        // выбросы (непремультиплированный RGB + edgeEmphasis)
        const a = data[i * 4 + 3] / 255;
        rgb[i * 3] = r * a;
        rgb[i * 3 + 1] = g * a;
        rgb[i * 3 + 2] = b * a;
        let l = ((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255) * a;
        l = (l - 0.5) * (contrast / 100) + 0.5 + brightness / 255;
        // Нормализация диапазона источника (0.10–0.75 → 0–1):
        // процедурный градиент темнее фото из оригинального эффекта,
        // без растяжки почти все воксели уходят в ноль
        l = (l - 0.1) / 0.65;
        lum[i] = Math.min(1, Math.max(0, l));
        phase[i] = Math.random() * Math.PI * 2;
      }

      vignetteGrad = ctx.createRadialGradient(
        cssW / 2,
        cssH / 2,
        0,
        cssW / 2,
        cssH / 2,
        Math.max(cssW, cssH) * 0.75,
      );
      vignetteGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
      vignetteGrad.addColorStop(
        1,
        `rgba(0, 0, 0, ${(pfx.vignette.intensity / 100) * 0.6})`,
      );

      const scanTile = document.createElement("canvas");
      scanTile.width = 1;
      scanTile.height = 3;
      const stc = scanTile.getContext("2d");
      if (stc) {
        stc.fillStyle = "rgba(0, 0, 0, 1)";
        stc.fillRect(0, 0, 1, 1);
        scanPattern = ctx.createPattern(scanTile, "repeat");
      }
      if (!grainPattern) {
        const grainTile = buildGrainTile();
        grainPattern = grainTile ? ctx.createPattern(grainTile, "repeat") : null;
      }
    }

    function render(t: number) {
      if (cols === 0 || rows === 0) return;

      sceneCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sceneCtx.clearRect(0, 0, cssW, cssH);
      const speedK = 0.6 + (animSpeed / 100) * 2.4;
      const shimmerAmp = (animIntensity / 100) * 0.7;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          let v = lum[i];
          if (edgeEmphasis > 0) {
            const left = x > 0 ? lum[i - 1] : v;
            const up = y > 0 ? lum[i - cols] : v;
            v += ((Math.abs(v - left) + Math.abs(v - up)) * edgeEmphasis) / 100;
          }
          v *= 1 + shimmerAmp * Math.sin(t * 0.001 * speedK + phase[i]);
          v = v < 0 ? 0 : v > 1 ? 1 : v;
          if (v < 0.04) continue;
          const size = Math.max(1.5, cellSize * v);
          const pad = (cellSize - size) / 2;
          const k = 0.55 + 0.45 * v;
          sceneCtx.fillStyle = `rgb(${Math.round(rgb[i * 3] * k)},${Math.round(
            rgb[i * 3 + 1] * k,
          )},${Math.round(rgb[i * 3 + 2] * k)})`;
          drawBox(sceneCtx, x * cellSize + pad, y * cellSize + pad, size);
        }
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Холст нужно очищать каждый кадр: при прозрачном фоне заливка
      // ничего не рисует, и без clearRect bloom/тинт накапливаются
      // кадр-к-кадру, пока не зальют холст сплошным цветом
      ctx.clearRect(0, 0, cssW, cssH);
      if (backgroundColor !== "transparent") {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, cssW, cssH);
      }

      if (pfx.bloom.enabled) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = (pfx.bloom.intensity / 100) * 0.55;
        ctx.filter = `blur(${3 + pfx.bloom.intensity / 8}px)`;
        ctx.drawImage(scene, 0, 0, cssW, cssH);
        ctx.restore();
      }
      ctx.drawImage(scene, 0, 0, cssW, cssH);

      if (tintOpacity > 0) {
        ctx.save();
        ctx.globalAlpha = tintOpacity;
        ctx.globalCompositeOperation = "overlay";
        ctx.fillStyle = tint;
        ctx.fillRect(0, 0, cssW, cssH);
        ctx.restore();
      }

      if (pfx.filmGrain.enabled && grainPattern) {
        ctx.save();
        ctx.globalAlpha = 0.03 + (pfx.filmGrain.intensity / 100) * 0.09;
        ctx.translate(-Math.random() * GRAIN_TILE_SIZE, -Math.random() * GRAIN_TILE_SIZE);
        ctx.fillStyle = grainPattern;
        ctx.fillRect(0, 0, cssW + GRAIN_TILE_SIZE, cssH + GRAIN_TILE_SIZE);
        ctx.restore();
      }

      if (pfx.scanLines.enabled && scanPattern) {
        ctx.save();
        ctx.globalAlpha = 0.08 + (pfx.scanLines.intensity / 100) * 0.25;
        ctx.fillStyle = scanPattern;
        ctx.fillRect(0, 0, cssW, cssH);
        ctx.restore();
      }

      if (pfx.vignette.enabled && vignetteGrad) {
        ctx.fillStyle = vignetteGrad;
        ctx.fillRect(0, 0, cssW, cssH);
      }

      if (
        pfx.glitch.enabled &&
        Math.random() < 0.01 + (pfx.glitch.intensity / 100) * 0.05
      ) {
        const slices = 1 + ((Math.random() * 2) | 0);
        for (let s = 0; s < slices; s++) {
          const syDev = Math.random() * Math.max(1, canvas.height - 20);
          const shDev = (4 + Math.random() * 10) * dpr;
          const dx = (Math.random() - 0.5) * (6 + pfx.glitch.intensity / 2);
          ctx.drawImage(
            canvas,
            0,
            syDev,
            canvas.width,
            shDev,
            dx,
            syDev / dpr,
            cssW,
            shDev / dpr,
          );
        }
      }
    }

    // Ограничение частоты анимации ~24 fps: эффект мерцания не меняется,
    // а нагрузка на главный поток падает в ~2.5 раза — важно на слабых
    // устройствах и для стабильности авто-тестов
    const FRAME_INTERVAL = 1000 / 24;
    let lastFrame = 0;
    const loop = (now: number) => {
      if (now - lastFrame >= FRAME_INTERVAL) {
        lastFrame = now;
        render(now);
      }
      if (running) raf = window.requestAnimationFrame(loop);
    };
    const start = () => {
      // Без анимации (animIntensity <= 0) цикл не нужен — экономим батарею/CPU:
      // статичный кадр рисуется один раз при инициализации
      if (running || reducedMotion || !hasRaf || disposed || animIntensity <= 0) return;
      running = true;
      raf = window.requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      if (raf) {
        window.cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    const repaintStatic = () => {
      if (!running) render(0);
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    const onWindowResize = () => {
      rebuild();
      repaintStatic();
    };

    rebuild();
    if (reducedMotion || !hasRaf || animIntensity <= 0) render(0);
    else start();

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver === "function") {
      ro = new ResizeObserver(() => {
        rebuild();
        repaintStatic();
      });
      ro.observe(container);
    } else {
      window.addEventListener("resize", onWindowResize);
    }
    document.addEventListener("visibilitychange", onVisibility);

    if (src) {
      image = new Image();
      image.onload = () => {
        prepared = removeImageBackground(image as HTMLImageElement);
        imageReady = true;
        rebuild();
        repaintStatic();
      };
      image.src = src;
    }

    return () => {
      disposed = true;
      stop();
      ro?.disconnect();
      window.removeEventListener("resize", onWindowResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [src, fit, imageScale, imageOffsetX, proceduralBg, cellSize, brightness, contrast, edgeEmphasis, animSpeed, animIntensity, backgroundColor, tint, tintOpacity, postEffects]);

  return (
    <div ref={containerRef} className={className} aria-hidden="true">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
