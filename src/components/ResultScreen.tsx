import { getResultExtremes, type ScoredProfession } from "../lib/scoring";
import PixelButton from "./PixelButton";
import PixelCard from "./PixelCard";
import SpecialText from "./SpecialText";

type Props = {
  scored: ScoredProfession[];
  /** Профессии без утверждённых весов — не ранжированы */
  pendingCount: number;
  onRestart: () => void;
  onOpenProfession: (professionId: string) => void;
};

const linkStyles =
  "text-left font-medium underline decoration-orange-300 underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 hover:decoration-orange-500";

export default function ResultScreen({
  scored,
  pendingCount,
  onRestart,
  onOpenProfession,
}: Props) {
  const { best, worst } = getResultExtremes(scored);
  const top = scored.slice(0, 3);

  return (
    <section data-testid="result-screen" aria-label="Результат теста">
      <SpecialText className="mb-1 text-2xl font-bold sm:text-3xl">
        Твой результат
      </SpecialText>
      <p className="mb-6 text-sm text-stone-500">
        Показатель соответствия модели теста, а не научно доказанная
        вероятность успеха. Нажми на профессию, чтобы узнать о ней больше.
      </p>

      <div className="mb-6">
        <PixelCard bg="#ffedd5">
          <p className="text-sm font-medium text-orange-800">
            Наиболее подходит:{" "}
            <button
              type="button"
              data-testid="best-profession-link"
              onClick={() => onOpenProfession(best.profession.id)}
              className={linkStyles}
            >
              {best.profession.title}
            </button>
          </p>
          <p className="mt-1 text-sm text-orange-900/80">
            {best.profession.description}
          </p>
        </PixelCard>
      </div>

      <ol className="mb-6 flex flex-col gap-2">
        {top.map((s) => (
          <li
            key={s.profession.id}
            className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-3"
          >
            <button
              type="button"
              data-testid="profession-result-link"
              onClick={() => onOpenProfession(s.profession.id)}
              className={`${linkStyles} min-h-11 grow pr-3`}
            >
              {s.profession.title}
            </button>
            <span className="font-medium tabular-nums">{s.percent}%</span>
          </li>
        ))}
      </ol>

      <div className="mb-6">
        <PixelCard>
          <p className="text-sm font-medium text-stone-700">
            Наименее подходит сейчас:{" "}
            <button
              type="button"
              onClick={() => onOpenProfession(worst.profession.id)}
              className={linkStyles}
            >
              {worst.profession.title}
            </button>
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Это не приговор: интересы могут измениться. Показатель отражает только
            соответствие твоих ответов модели этого теста.
          </p>
        </PixelCard>
      </div>

      {pendingCount > 0 && (
        <div className="mb-6">
          <PixelCard bg="#fef3c7">
            <p className="text-xs text-amber-800">
              Методика теста пока утверждена не для всех профессий: ещё {pendingCount}{" "}
              профессий не участвуют в подсчёте. Их карточки уже доступны в разделе
              «Галерея профессий».
            </p>
          </PixelCard>
        </div>
      )}

      <PixelButton
        type="button"
        variant="primary"
        data-testid="restart-btn"
        onClick={onRestart}
        className="block min-h-11 px-6 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
      >
        Пройти заново
      </PixelButton>
    </section>
  );
}
