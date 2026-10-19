import { SCALE_LABELS, SCALE_VALUES } from "../types/test";
import PixelButton from "./PixelButton";

type Props = {
  questionText: string;
  index: number;
  total: number;
  selected: number | null;
  onAnswer: (value: number) => void;
  onNext: () => void;
  onBack: () => void;
  canGoBack: boolean;
};

const optionStyles =
  "flex min-h-11 w-full items-center rounded-xl border-2 p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 motion-safe:transition-colors";

export default function QuestionScreen({
  questionText,
  index,
  total,
  selected,
  onAnswer,
  onNext,
  onBack,
  canGoBack,
}: Props) {
  return (
    <section aria-label={`Вопрос ${index + 1} из ${total}`}>
      <p className="mb-2 text-sm text-stone-500">
        Вопрос {index + 1} из {total}
      </p>
      <h2 className="mb-4 text-lg font-medium leading-snug">{questionText}</h2>

      <p className="mb-2 text-xs text-stone-500">
        Оцени по шкале от 1 («совсем не моё») до 5 («абсолютно моё»)
      </p>
      <div className="flex flex-col gap-2">
        {SCALE_VALUES.map((value) => {
          const isSelected = selected === value;
          return (
            <button
              key={value}
              type="button"
              data-testid="answer-option"
              aria-pressed={isSelected}
              onClick={() => onAnswer(value)}
              className={`${optionStyles} ${
                isSelected
                  ? "border-orange-600 bg-orange-100 font-medium shadow-[2px_2px_0_0_#9a3412]"
                  : "border-stone-300 bg-white hover:border-orange-400 hover:bg-orange-50"
              }`}
            >
              <span
                aria-hidden="true"
                className={`mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium tabular-nums ${
                  isSelected
                    ? "border-orange-600 bg-orange-600 text-white"
                    : "border-stone-400 text-stone-600"
                }`}
              >
                {value}
              </span>
              {SCALE_LABELS[value]}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <PixelButton
          type="button"
          data-testid="back-btn"
          onClick={onBack}
          disabled={!canGoBack}
          className="min-h-11 px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Назад
        </PixelButton>
        <PixelButton
          type="button"
          variant="primary"
          data-testid="next-btn"
          onClick={onNext}
          disabled={selected == null}
          className="min-h-11 px-6 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {index + 1 === total ? "Завершить" : "Далее"}
        </PixelButton>
      </div>
    </section>
  );
}
