import PixelButton from "../../components/PixelButton";

/**
 * Подтверждение сна.
 *
 * Сон закрывает день, поэтому спросить надо всегда. Но если времени ещё
 * много, игрок должен понимать, чем он жертвует: игрок — это и есть Соломон,
 * и бездельничающий белка — это и скука, и потерянный день.
 */
type Props = {
  /** Сколько минут до конца дня осталось. */
  minutesLeft: number;
  /** Подтверждение: игрок всё-таки хочет поспать. */
  onConfirm: () => void;
  /** Отмена: день продолжается. */
  onCancel: () => void;
};

/** Порог, после которого игрока предупреждают: времени ещё много. */
const MANY_MINUTES = 90;

export default function SleepConfirm({ minutesLeft, onConfirm, onCancel }: Props) {
  const hours = Math.floor(minutesLeft / 60);
  const minutes = minutesLeft % 60;
  const left = hours > 0 ? `${hours} ч ${minutes} мин` : `${minutes} мин`;
  const muchTimeLeft = minutesLeft >= MANY_MINUTES;

  return (
    <section
      role="dialog"
      aria-label="Подтверждение сна"
      className="rounded-xl border-2 border-indigo-300 bg-indigo-50 p-4 shadow-[3px_3px_0_#a5b4fc]"
    >
      <h3 className="text-lg font-bold text-stone-900">
        {muchTimeLeft ? "Спать так рано?" : "Закончить день сном?"}
      </h3>
      {muchTimeLeft ? (
        <p className="mt-1 text-sm text-stone-700">
          Вы — Соломон, и вы можете ещё много чего сделать: осталось{" "}
          <span className="font-bold">{left}</span>. Если ляжете спать сейчас,
          придётся бездельничать, а день закончится раньше времени.
        </p>
      ) : (
        <p className="mt-1 text-sm text-stone-700">
          Осталось <span className="font-bold">{left}</span>. Сон вернёт силы,
          но опустит сытость — поесть придётся завтра утром.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <PixelButton
          type="button"
          variant="primary"
          onClick={onConfirm}
          className="min-h-11 px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
        >
          {muchTimeLeft ? "Всё равно поспать" : "Да, поспать"}
        </PixelButton>
        <PixelButton
          type="button"
          onClick={onCancel}
          className="min-h-11 px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
        >
          Ещё поработать
        </PixelButton>
      </div>
    </section>
  );
}
