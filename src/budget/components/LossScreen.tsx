import PixelButton from "../../components/PixelButton";
import Icon from "./Icon";
import type { LossReason } from "../core/types";

/**
 * Экран проигрыша.
 *
 * Игра заканчивается не только «время вышло», но и провалом ухода: если
 * за Соломоном не смотрели, он заболел. Слова на экране — из правил игры,
 * поэтому здесь нет общих фраз вроде «вы проиграли».
 */
type Props = {
  reason: LossReason;
  onMenu: () => void;
};

export default function LossScreen({ reason, onMenu }: Props) {
  return (
    <section
      aria-label="Проигрыш"
      className="flex flex-col items-start gap-4 rounded-xl border-2 border-rose-400 bg-rose-50 p-6 shadow-[4px_4px_0_#fda4af]"
    >
      <h2 className="flex items-center gap-2 text-2xl font-bold text-rose-900">
        <Icon name="ui/ui-warning" alt="" size={26} />
        {reason.title}
      </h2>
      <p className="max-w-prose text-base text-stone-800">{reason.text}</p>
      <PixelButton
        type="button"
        onClick={onMenu}
        className="min-h-11 px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
      >
        В меню
      </PixelButton>
    </section>
  );
}
