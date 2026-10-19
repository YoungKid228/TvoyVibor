import { Button } from "pixel-retroui";
import type { ButtonHTMLAttributes, CSSProperties } from "react";

type Variant = "primary" | "neutral";

type PixelButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

/** Единая нежно-оранжевая тема для pixel-retroui Button. */
export default function PixelButton({
  variant = "neutral",
  className,
  style,
  ...rest
}: PixelButtonProps) {
  const colors =
    variant === "primary"
      ? { bg: "#f97316", textColor: "#fff7ed" }
      : { bg: "#ffedd5", textColor: "#7c2d12" };
  return (
    <Button
      {...rest}
      className={`pixel-btn ${className ?? ""}`}
      borderColor="#9a3412"
      shadow="#7c2d12"
      {...colors}
      style={{ margin: 4, ...(style as CSSProperties | undefined) }}
    />
  );
}
