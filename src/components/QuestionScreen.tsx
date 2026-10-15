import type { Question } from "../types/test";

type Props = {
  question: Question;
  index: number;
  total: number;
  selected: string | null;
  onAnswer: (optionId: string) => void;
  onNext: () => void;
  onBack: () => void;
  canGoBack: boolean;
};

const optionStyles =
  "flex min-h-11 w-full items-center rounded-xl border p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 motion-safe:transition-colors";

export default function QuestionScreen({
  question,
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
      <p className="mb-2 text-sm text-slate-500">
        Вопрос {index + 1} из {total}
      </p>
      <h2 className="mb-4 text-lg font-medium leading-snug">{question.text}</h2>

      <div className="flex flex-col gap-2">
        {question.options.map((option) => {
          const isSelected = selected === option.id;
          return (
            <button
              key={option.id}
              type="button"
              data-testid="answer-option"
              aria-pressed={isSelected}
              onClick={() => onAnswer(option.id)}
              className={`${optionStyles} ${
                isSelected
                  ? "border-sky-600 bg-sky-50 font-medium"
                  : "border-slate-200 bg-white hover:border-sky-400"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          data-testid="back-btn"
          onClick={onBack}
          disabled={!canGoBack}
          className="min-h-11 rounded-lg px-4 text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:opacity-40"
        >
          Назад
        </button>
        <button
          type="button"
          data-testid="next-btn"
          onClick={onNext}
          disabled={selected == null}
          className="min-h-11 rounded-lg bg-sky-600 px-6 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:opacity-40"
        >
          {index + 1 === total ? "Завершить" : "Далее"}
        </button>
      </div>
    </section>
  );
}
