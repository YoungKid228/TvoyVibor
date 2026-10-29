import type { Profession, ProfessionDetail, Program } from "../types/test";
import PixelButton from "../components/PixelButton";
import PixelCard from "../components/PixelCard";

type Props = {
  profession: Profession | undefined;
  detail: ProfessionDetail | undefined;
  program: Program | undefined;
  onBack: () => void;
  onOpenProgram: (programId: string) => void;
};

function PendingNote({ text }: { text: string }) {
  return (
    <p className="text-sm italic text-stone-400" data-testid="pending-section">
      {text}
    </p>
  );
}

function DetailSection({
  title,
  text,
  pendingText,
}: {
  title: string;
  text: string | null;
  pendingText: string;
}) {
  return (
    <PixelCard>
      <h3 className="mb-2 text-base font-medium text-stone-700">{title}</h3>
      {text ? (
        <p className="text-sm text-stone-600">{text}</p>
      ) : (
        <PendingNote text={pendingText} />
      )}
    </PixelCard>
  );
}

export default function ProfessionPage({
  profession,
  detail,
  program,
  onBack,
  onOpenProgram,
}: Props) {
  if (!profession) {
    return (
      <p className="text-stone-600">
        Профессия не найдена.{" "}
        <button
          type="button"
          onClick={onBack}
          className="text-orange-700 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
        >
          В галерею
        </button>
      </p>
    );
  }

  return (
    <section aria-label={profession.title}>
      <PixelButton
        type="button"
        onClick={onBack}
        className="min-h-11 px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
        style={{ marginBottom: 24 }}
      >
        ← В галерею профессий
      </PixelButton>

      <h2 className="mb-1 text-xl font-semibold">{profession.title}</h2>
      {program && (
        <p className="mb-6 text-sm text-orange-700">
          {program.code} · {program.title} · {program.level}
          {program.profiles.length > 0 && ` — ${program.profiles.join(", ")}`}
        </p>
      )}

      <div className="flex flex-col gap-6">
        <PixelCard>
          <h3 className="mb-2 text-base font-medium text-stone-700">
            Описание профессии
          </h3>
          <p className="text-sm text-stone-600">{profession.description}</p>
        </PixelCard>

        <DetailSection
          title="Задачи и навыки"
          text={detail?.tasksAndSkills ?? null}
          pendingText="Информация готовится — задачи и навыки будут заполнены на основе материалов галереи профессий."
        />

        <PixelCard>
          <h3 className="mb-2 text-base font-medium text-stone-700">
            Заработная плата в ЕАО
          </h3>
          {detail?.salary ? (
            <p className="text-sm text-stone-600">{detail.salary}</p>
          ) : (
            <PendingNote text="Информация готовится — данные о заработной плате в Еврейской автономной области будут добавлены позже." />
          )}
        </PixelCard>

        <DetailSection
          title="Карьера"
          text={detail?.career ?? null}
          pendingText="Информация готовится — карьерные перспективы будут заполнены позже."
        />

        <PixelCard>
          <h3 className="mb-2 text-base font-medium text-stone-700">
            Связь с программами в ПГУ им. Шолом-Алейхема
          </h3>
          {program ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-stone-600">
                Профессия осваивается в рамках программы подготовки:
              </p>
              <div className="rounded-lg border border-stone-200 p-3">
                <p className="text-sm font-medium">
                  {program.code} · {program.title} · {program.level}
                </p>
                {program.profiles.length > 0 && (
                  <p className="mt-1 text-sm text-stone-500">
                    {program.profiles.join(", ")}
                  </p>
                )}
                <PixelButton
                  type="button"
                  variant="primary"
                  data-testid="open-program-link"
                  onClick={() => onOpenProgram(program.id)}
                  className="min-h-11 px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
                  style={{ marginTop: 20 }}
                >
                  Перейти к программе →
                </PixelButton>
              </div>
            </div>
          ) : (
            <PendingNote text="Связанная программа подготовки не указана." />
          )}
        </PixelCard>
      </div>
    </section>
  );
}
