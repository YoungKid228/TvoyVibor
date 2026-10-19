import { Card } from "pixel-retroui";
import type { CSSProperties, ReactNode } from "react";

type PixelCardProps = {
  children: ReactNode;
  className?: string;
  /** Цвет фона карточки, по умолчанию тёплый кремовый */
  bg?: string;
  /** Переопределение базовых отступов (по умолчанию p-4, внешний отступ 4px) */
  style?: CSSProperties;
};

/**
 * Обёртка над pixel-retroui Card с единой нежно-оранжевой темой.
 * Отступы задаются инлайном, потому что CSS-модуль библиотеки
 * перебивается только inline-стилями и утилитами верхнего слоя.
 */
export default function PixelCard({
  children,
  className,
  bg = "#fffaf2",
  style,
}: PixelCardProps) {
  return (
    <Card
      className={`pixel-card ${className ?? ""}`}
      bg={bg}
      textColor="#431407"
      borderColor="#9a3412"
      shadowColor="#b45309"
      style={{ margin: 4, padding: 16, ...style }}
    >
      {children}
    </Card>
  );
}
