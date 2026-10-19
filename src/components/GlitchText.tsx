import type { CSSProperties, ElementType } from "react";

type GlitchTextProps = {
  text: string;
  as?: ElementType;
  className?: string;
  /** Длительность одного цикла глитча */
  speed?: number;
  /** Анимировать только при наведении курсора */
  enableOnHover?: boolean;
};

/**
 * Глитч-текст по образцу Kokonut UI (kokonutui.com/r/glitch-text).
 * Перенесён в проект напрямую: shadcn CLI в проекте не настроен,
 * внешние зависимости не требуются.
 * Слои — aria-hidden-спаны вместо псевдоэлементов, чтобы текст
 * не читался скринридерами дважды.
 */
export default function GlitchText({
  text,
  as: Tag = "span",
  className,
  speed = 2200,
  enableOnHover = false,
}: GlitchTextProps) {
  const mode = enableOnHover ? "glitch--hover" : "glitch--on";
  return (
    <Tag
      className={`glitch ${mode} ${className ?? ""}`}
      style={{ "--glitch-speed": `${speed}ms` } as CSSProperties}
    >
      <span className="glitch__layer glitch__layer--a" aria-hidden="true">
        {text}
      </span>
      <span className="glitch__layer glitch__layer--b" aria-hidden="true">
        {text}
      </span>
      <span className="glitch__base">{text}</span>
    </Tag>
  );
}
