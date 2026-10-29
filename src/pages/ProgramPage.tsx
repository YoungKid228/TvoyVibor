import type {
  Program,
  ProgramCareer,
  ProgramGroup,
  ProgramOption,
  ProgramProfile,
  Profession,
} from "../types/test";

type Props = {
  program: Program | undefined;
  professions: Profession[];
  profileName?: string;
  onBack: () => void;
  onOpenProfession: (professionId: string) => void;
  onSelectProfile?: (profileName: string) => void;
};

import PixelButton from "../components/PixelButton";
import PixelCard from "../components/PixelCard";

const pendingNote =
  "Раздел готовится — информация будет добавлена с официальной страницы программы.";

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <PixelCard>
      <h3 className="mb-2 text-base font-medium text-stone-700">{title}</h3>
      {children}
    </PixelCard>
  );
}

function PendingSection({ title }: { title: string }) {
  return (
    <PixelCard>
      <h3 className="mb-2 text-base font-medium text-stone-700">{title}</h3>
      <p className="text-sm italic text-stone-400" data-testid="pending-section">
        {pendingNote}
      </p>
    </PixelCard>
  );
}

function Paragraphs({ items }: { items: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((text, i) => (
        <p key={i} className="text-sm text-stone-600">
          {text}
        </p>
      ))}
    </div>
  );
}

function GroupList({ groups }: { groups: ProgramGroup[] }) {
  return (
    <div className="flex flex-col gap-3">
      {groups.map((g) => (
        <div key={g.group}>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500">
            {g.group}
          </p>
          <ul className="list-inside list-disc text-sm text-stone-600">
            {g.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Careers({ careers }: { careers: ProgramCareer[] }) {
  return (
    <ul className="flex flex-col gap-2 text-sm text-stone-600">
      {careers.map((c) => (
        <li key={c.area}>
          <span className="font-medium text-stone-800">{c.area}</span> — {c.text}
        </li>
      ))}
    </ul>
  );
}

/**
 * Убирает из текста минимальные баллы:
 * «Русский язык — 40» → «Русский язык»,
 * «экономика — 60 баллов» → «экономика».
 * Границы слов заданы через \p{L}, потому что \b в JS работает только с ASCII.
 */
function stripScores(text: string): string {
  return text
    .replace(
      /\s*[—–-]\s*(?:не\s+менее\s+)?\d+\s*балл(?:ов|а)?(?![\p{L}])/giu,
      " ",
    )
    .replace(/\s*[—–-]\s*\d+(?!\d)\s*$/u, "")
    .replace(/\(\s*\d+\s*балл(?:ов|а)?(?!\p{L})\s*\)/giu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Убирает из примечания предложения про количество мест */
function stripNote(note: string | null): string | null {
  if (!note) return null;
  const parts = note
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter(
      (s) => s.length > 0 && !/(^|[^\p{L}])мест(?![\p{L}])/iu.test(s),
    );
  return parts.length > 0 ? parts.join(" ") : null;
}

/**
 * Варианты поступления: форма, база и срок обучения.
 * Количество мест, стоимость и проходные баллы в приложении не показываются.
 */
function AdmissionOptions({
  program,
  options,
}: {
  program: Program;
  options: ProgramOption[];
}) {
  return (
    <ul className="flex flex-col gap-3" data-testid="admission-options">
      {options.map((option, i) => {
        return (
          <li
            key={`${option.form}-${option.base ?? i}`}
            className="border-2 border-stone-200 bg-stone-50/60 p-2"
          >
            <p className="text-sm font-medium text-stone-800">
              {option.form}
              {option.base ? ` · ${option.base.toLowerCase()}` : ""}
            </p>
            <ul className="mt-1 flex flex-col gap-0.5 text-sm text-stone-600">
              {option.duration && <li>Срок обучения: {option.duration}</li>}
              {option.profiles && option.profiles.length > 0 && (
                <li>
                  Направления:{" "}
                  {option.profiles
                    .filter((p) => !isProfileRedundant(program, p))
                    .join(", ") || option.profiles.join(", ")}
                </li>
              )}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}

/** Название профиля дублирует название программы — не показываем его повторно */
function isProfileRedundant(program: Program, profile: string): boolean {
  const normalize = (s: string) =>
    s.replace(/\s*\(.*\)\s*/, "").replace(/ё/g, "е").trim().toLowerCase();
  return normalize(program.title) === normalize(profile);
}

function ProfileForms({ profile }: { profile: ProgramProfile }) {
  if (!profile.forms || profile.forms.length === 0) return null;
  return (
    <p className="text-sm text-stone-500">
      Форма обучения: {profile.forms.join(", ").toLowerCase()}
    </p>
  );
}

function ProgramFacts({
  program,
}: {
  program: Program;
}) {
  const rows = program.forms.map((form) => ({
    form,
    duration:
      program.durationByForm?.[form] ??
      (program.forms.length === 1 ? program.duration : null),
  }));
  return (
    <ul className="mb-4 mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600">
      {rows.length > 1 ? (
        rows.map((r) => (
          <li key={r.form}>
            {r.form}: {r.duration ?? "срок уточняется"}
          </li>
        ))
      ) : (
        <>
          {rows[0]?.duration && <li>Срок обучения: {rows[0].duration}</li>}
          {rows[0]?.form && <li>Форма: {rows[0].form}</li>}
        </>
      )}
      {program.language && <li>Язык обучения: {program.language}</li>}
      {program.baseEducation && <li>{program.baseEducation}</li>}
    </ul>
  );
}

function ProfileSection({ profile }: { profile: ProgramProfile }) {
  const note = stripNote(profile.note);
  const hasContent =
    profile.description ||
    profile.highlights ||
    profile.headQuote ||
    profile.outcomes ||
    profile.careers ||
    profile.howItWorks ||
    profile.disciplines ||
    profile.competencies ||
    note;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <h3 className="text-base font-semibold text-stone-800" data-testid="profile-name">
        {profile.name}
      </h3>
      {note && (
        <p className="mt-1 text-sm text-stone-500">{note}</p>
      )}
      {profile.exams && (
        <ul className="mt-2 list-inside list-disc text-sm text-stone-600">
          {profile.exams.map((exam) => (
            <li key={exam}>Вступительное испытание: {stripScores(exam)}</li>
          ))}
        </ul>
      )}
      <div className="mt-2">
        <ProfileForms profile={profile} />
      </div>

      {!hasContent && (
        <p className="mt-2 text-sm italic text-stone-400" data-testid="pending-section">
          {pendingNote}
        </p>
      )}

      {profile.description && (
        <div className="mt-3">
          <h4 className="mb-1 text-sm font-medium text-stone-700">О программе</h4>
          <Paragraphs items={profile.description} />
        </div>
      )}
      {profile.highlights && (
        <ul className="mt-3 flex flex-col gap-1 text-sm text-stone-600">
          {profile.highlights.map((h) => (
            <li key={h} className="rounded-lg bg-orange-50 px-3 py-2 text-orange-900">
              {h}
            </li>
          ))}
        </ul>
      )}
      {profile.outcomes && (
        <div className="mt-3">
          <h4 className="mb-1 text-sm font-medium text-stone-700">
            Что я смогу после обучения?
          </h4>
          <p className="text-sm text-stone-600">{profile.outcomes}</p>
        </div>
      )}
      {profile.careers && (
        <div className="mt-3">
          <h4 className="mb-1 text-sm font-medium text-stone-700">
            Карьерные перспективы
          </h4>
          <Careers careers={profile.careers} />
        </div>
      )}
      {profile.howItWorks && (
        <div className="mt-3">
          <h4 className="mb-1 text-sm font-medium text-stone-700">
            Как проходит обучение?
          </h4>
          <Paragraphs items={profile.howItWorks} />
        </div>
      )}
      {profile.disciplines && (
        <div className="mt-3">
          <h4 className="mb-1 text-sm font-medium text-stone-700">
            Что я буду изучать?
          </h4>
          <ul className="list-inside list-disc text-sm text-stone-600">
            {profile.disciplines.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      )}
      {profile.competencies && (
        <div className="mt-3">
          <h4 className="mb-1 text-sm font-medium text-stone-700">Компетенции</h4>
          <GroupList groups={profile.competencies} />
        </div>
      )}
      {note && (
        <p className="mt-3 text-sm italic text-stone-400" data-testid="pending-section">
          {note}
        </p>
      )}
      {profile.headQuote && (
        <blockquote className="mt-3 border-l-4 border-orange-300 pl-3 text-sm italic text-stone-600">
          «{profile.headQuote}»
        </blockquote>
      )}
    </div>
  );
}

export default function ProgramPage({
  program,
  professions,
  profileName,
  onBack,
  onOpenProfession,
  onSelectProfile,
}: Props) {
  if (!program) {
    return (
      <p className="text-stone-600">
        Направление не найдено.{" "}
        <button
          type="button"
          onClick={onBack}
          className="text-orange-700 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
        >
          К списку направлений
        </button>
      </p>
    );
  }

  const related = professions.filter((p) => p.programId === program.id);
  const isMultiProfile = program.profiles.length > 1;
  const selectedProfile =
    profileName !== undefined
      ? program.profileDetails.find((p) => p.name === profileName)
      : undefined;
  const shownProfiles =
    isMultiProfile && selectedProfile ? [selectedProfile] : program.profileDetails;

  /* Баллы и количество мест в приложении не показываем */
  const cleanedAdmission = (program.admission ?? [])
    .map((group) => ({
      group: group.group,
      items: group.items
        .map(stripScores)
        .filter((item) => item.length > 0 && !/балл/i.test(item)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <section aria-label={`${program.title} (${program.level})`}>
      <PixelButton
        type="button"
        onClick={onBack}
        className="min-h-11 px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
        style={{ marginBottom: 24 }}
      >
        ← К направлениям подготовки
      </PixelButton>

      <h2 className="mb-1 text-xl font-semibold">
        {program.title} {program.code}
      </h2>
      <p className="text-sm text-orange-700">
        {program.level}
        {program.profiles.length === 1 &&
          !isProfileRedundant(program, program.profiles[0]) &&
          ` — профиль: ${program.profiles[0]}`}
      </p>
      {isMultiProfile && (
        <div className="mt-4">
          <PixelCard>
            <h3 className="mb-2 text-base font-medium text-stone-700">
              Профили магистратуры
            </h3>
            <ul className="flex flex-col gap-2">
              {program.profileDetails.map((p) => {
                const active = p.name === selectedProfile?.name;
                const forms = p.forms;
                return (
                  <li key={p.name}>
                    <button
                      type="button"
                      data-testid="profile-switch"
                      aria-current={active ? "true" : undefined}
                      onClick={() => onSelectProfile?.(p.name)}
                      className={`block w-full rounded-lg border-2 px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
                        active
                          ? "border-orange-500 bg-orange-100"
                          : "border-stone-300 bg-white hover:border-orange-300 hover:bg-orange-50"
                      }`}
                    >
                      <span
                        className={`block text-sm font-medium ${
                          active ? "text-orange-900" : "text-stone-800"
                        }`}
                      >
                        {p.name}
                      </span>
                      {forms && forms.length > 0 && (
                        <span className="mt-0.5 block text-xs text-stone-500">
                          Форма обучения: {forms.join(", ").toLowerCase()}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-stone-500">
              Выберите профиль — ниже появится его описание, дисциплины и
              компетенции.
            </p>
          </PixelCard>
        </div>
      )}
      {program.faculty && (
        <p className="text-sm text-stone-500">
          {program.faculty}
          {program.department && ` · ${program.department}`}
        </p>
      )}
      <ProgramFacts program={program} />

      <div className="flex flex-col gap-6">
        {!isMultiProfile &&
          program.profileDetails
            .filter((profile) => profile.headQuote)
            .map((profile) => (
              <blockquote
                key={profile.name}
                className="border-l-4 border-orange-300 pl-3 text-sm italic text-stone-600"
              >
                «{profile.headQuote}»
              </blockquote>
            ))}

        {program.admissionOptions && program.admissionOptions.length > 0 && (
          <Card title="Варианты поступления">
            <AdmissionOptions program={program} options={program.admissionOptions} />
          </Card>
        )}

        {cleanedAdmission.length > 0 && (
          <Card title="Вступительные испытания">
            <GroupList groups={cleanedAdmission} />
          </Card>
        )}

        {program.qualification && (
          <Card title="Квалификация и виды деятельности">
            <p className="text-sm text-stone-600">
              Квалификация выпускника: <strong>{program.qualification}</strong>
            </p>
            <ul className="mt-1 list-inside list-disc text-sm text-stone-600">
              {(program.activityTypes ?? []).map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            {program.qualificationDetails && (
              <ul className="mt-2 list-inside list-disc text-sm text-stone-600">
                {program.qualificationDetails.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {program.description ? (
          <Card title="О программе">
            <Paragraphs items={program.description} />
          </Card>
        ) : (
          program.pending.includes("Описание") && <PendingSection title="Описание" />
        )}

        {program.outcomes && (
          <Card title="Что я смогу после обучения?">
            <p className="text-sm text-stone-600">{program.outcomes}</p>
          </Card>
        )}

        {program.careers ? (
          <Card title="Карьерные перспективы">
            <Careers careers={program.careers} />
          </Card>
        ) : (
          program.pending.includes("Карьерные перспективы") && (
            <PendingSection title="Карьерные перспективы" />
          )
        )}

        {program.howItWorks && (
          <Card title="Как проходит обучение?">
            <Paragraphs items={program.howItWorks} />
          </Card>
        )}

        {program.disciplines ? (
          <Card title="Что я буду изучать?">
            <GroupList groups={program.disciplines} />
          </Card>
        ) : (
          program.pending.includes("Дисциплины") && (
            <PendingSection title="Дисциплины" />
          )
        )}

        {program.competencies ? (
          <Card title="Профессиональные компетенции">
            <GroupList groups={program.competencies} />
            {program.generalCompetencies && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-orange-700">
                  Общие компетенции ({program.generalCompetencies.length})
                </summary>
                <ul className="mt-2 list-inside list-disc text-sm text-stone-600">
                  {program.generalCompetencies.map((ok) => (
                    <li key={ok}>{ok}</li>
                  ))}
                </ul>
              </details>
            )}
          </Card>
        ) : (
          program.pending.includes("Компетенции") && (
            <PendingSection title="Компетенции" />
          )
        )}

        {isMultiProfile && (
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-stone-700">
              {selectedProfile ? "О выбранном профиле" : "Профили программы"}
            </h3>
            {shownProfiles.map((profile) => (
              <ProfileSection key={profile.name} profile={profile} />
            ))}
          </div>
        )}

        {program.head && (
          <Card title="Руководитель программы">
            <p className="text-sm font-medium text-stone-800">{program.head.name}</p>
            <p className="text-sm text-stone-500">{program.head.title}</p>
            {program.head.bio && (
              <p className="mt-1 text-sm text-stone-600">{program.head.bio}</p>
            )}
          </Card>
        )}

        {program.partners && (
          <Card title="Партнёры">
            <ul className="list-inside list-disc text-sm text-stone-600">
              {program.partners.map((partner) => (
                <li key={partner}>{partner}</li>
              ))}
            </ul>
          </Card>
        )}

        {program.sourceUrl && (
          <Card title="Официальная страница программы">
            <a
              href={program.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-orange-700 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
            >
              Открыть на сайте ПГУ им. Шолом-Алейхема
            </a>
            <p className="mt-1 text-xs text-stone-500">
              Учебные документы (ООП, стандарт, учебный план, практики) доступны на
              официальной странице.
            </p>
          </Card>
        )}

        <Card title="Связанные профессии">
          <ul className="flex flex-col gap-1">
            {related.map((profession) => (
              <li key={profession.id}>
                <button
                  type="button"
                  data-testid="related-profession-link"
                  onClick={() => onOpenProfession(profession.id)}
                  className="min-h-11 w-full rounded-lg px-2 text-left text-sm font-medium text-orange-700 underline decoration-orange-300 underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 hover:decoration-orange-500"
                >
                  {profession.title}
                </button>
              </li>
            ))}
            {related.length === 0 && (
              <li className="text-sm text-stone-500">
                Профессии для этой программы пока не добавлены.
              </li>
            )}
          </ul>
        </Card>
      </div>
    </section>
  );
}
