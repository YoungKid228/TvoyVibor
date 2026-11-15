import { iconUrl } from '../../assets/ui/icons';

/**
 * Компонент иконки — пиксель-арт изображение из реестра.
 *
 * Если иконка не найдена по пути — компонент рендерит null (ничего не ломает).
 * Иконки отрисовываются с imageRendering: pixelated для сохранения чёткости.
 */

type Props = {
  /** Путь вида "ui/spend-coffee", "ui/job-courier" и т.д. */
  name: string;
  /** Alt-текст для доступности. */
  alt?: string;
  /** CSS-класс. */
  className?: string;
  /** Размер в пикселях (ширина и высота). По умолчанию 32. */
  size?: number;
};

export default function Icon({ name, alt, className, size = 32 }: Props) {
  const url = iconUrl(name);
  if (!url) return null;

  return (
    <img
      src={url}
      alt={alt ?? name}
      className={className}
      width={size}
      height={size}
      style={{ imageRendering: 'pixelated', display: 'inline-block' }}
    />
  );
}
