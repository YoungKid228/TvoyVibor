export type Audience = "school" | "college_or_bachelor";

/**
 * Ответ пользователя по 5-балльной шкале:
 * 1 — «Совсем не моё», 2 — «Скорее не моё», 3 — «Нейтрально»,
 * 4 — «Скорее моё», 5 — «Абсолютно моё».
 */
export const SCALE_VALUES = [1, 2, 3, 4, 5] as const;
export type ScaleValue = (typeof SCALE_VALUES)[number];

export const SCALE_LABELS: Record<ScaleValue, string> = {
  1: "Совсем не моё",
  2: "Скорее не моё",
  3: "Нейтрально",
  4: "Скорее моё",
  5: "Абсолютно моё",
};

/** Знаковое влияние вопроса на профессию. 0 — влияния нет. */
export type Question = {
  id: string;
  text: string;
  weights: Record<string, number>;
};

export type CareerTest = {
  id: string;
  directionId: string;
  audience: Audience;
  title: string;
  questionIds: string[];
};

/** Тест по конкретной профессии: 10 вопросов про реальные рабочие задачи */
export type ProfessionTest = {
  professionId: string;
  questions: string[];
};

export type Profession = {
  id: string;
  directionId: string;
  programId: string;
  title: string;
  description: string;
};

/**
 * Содержимое карточки галереи профессий.
 * null означает «информация готовится» — раздел будет заполнен
 * из файлов-образцов галереи профессий.
 */
export type ProfessionDetail = {
  tasksAndSkills: string | null;
  salary: string | null;
  career: string | null;
};

export type ProgramCareer = {
  /** Сфера трудоустройства, например «В банке» */
  area: string;
  text: string;
};

/** Группированный список: дисциплины или компетенции по видам деятельности */
export type ProgramGroup = {
  group: string;
  items: string[];
};

/**
 * Детальные сведения по профилю программы (из данных официальной страницы).
 * null — информация на источнике отсутствует, раздел помечается как «готовится».
 */
export type ProgramProfile = {
  /** Должно совпадать с одним из значений Program.profiles */
  name: string;
  budgetPlaces: number | null;
  paidPlaces: number | null;
  passScore: number | null;
  /** Вступительные испытания, например «Экономика — 60 баллов» */
  exams: string[] | null;
  /** Форма обучения профиля, если она отличается от общих форм программы */
  forms: string[] | null;
  /** Причина отсутствия данных, например «информация готовится» */
  note: string | null;
  description: string[] | null;
  highlights: string[] | null;
  headQuote: string | null;
  outcomes: string | null;
  careers: ProgramCareer[] | null;
  howItWorks: string[] | null;
  disciplines: string[] | null;
  /** Компетенции профиля (для программ с несколькими профилями) */
  competencies: ProgramGroup[] | null;
  generalCompetencies: string[] | null;
};

/**
 * Вариант поступления на программу: форма обучения + база поступления,
 * срок, количество мест и стоимость (данные приёмной кампании).
 * Нужен там, где срок и места зависят от формы И базы (СПО: на базе
 * 9 или 11 классов; бакалавриат/магистратура: очная и заочная).
 */
export type ProgramOption = {
  /** Форма обучения: «Очная» / «Заочная» */
  form: string;
  /** База поступления, например «На базе 11 классов» */
  base: string | null;
  /** Срок обучения по этому варианту */
  duration: string | null;
  budgetPlaces: number | null;
  paidPlaces: number | null;
  /** Стоимость обучения в год, если указана */
  costPerYear: string | null;
  /** Профили, на которые принимают по этому варианту (магистратура) */
  profiles: string[] | null;
};

export type Program = {
  id: string;
  code: string;
  title: string;
  level: string;
  profiles: string[];
  forms: string[];
  duration: string | null;
  /** Срок обучения по каждой форме обучения, ключи совпадают с forms */
  durationByForm: Record<string, string> | null;
  language: string | null;
  costPerYear: string | null;
  /** Стоимость по каждой форме обучения, ключи совпадают с forms */
  costPerYearByForm: Record<string, string> | null;
  baseEducation: string | null;
  faculty: string | null;
  department: string | null;
  head: { name: string; title: string; bio: string | null } | null;
  qualification: string | null;
  activityTypes: string[] | null;
  /** Дополнительные сведения о квалификации и видах деятельности (из учебного плана/ООП) */
  qualificationDetails: string[] | null;
  /** Группы вступительных испытаний по базам поступления */
  admission: ProgramGroup[] | null;
  /** Варианты поступления: форма, база, срок, места и стоимость */
  admissionOptions: ProgramOption[] | null;
  description: string[] | null;
  outcomes: string | null;
  howItWorks: string[] | null;
  disciplines: ProgramGroup[] | null;
  competencies: ProgramGroup[] | null;
  generalCompetencies: string[] | null;
  careers: ProgramCareer[] | null;
  partners: string[] | null;
  profileDetails: ProgramProfile[];
  /** Официальная страница программы на сайте ПГУ */
  sourceUrl: string | null;
  /** Разделы, по которым на источнике нет данных */
  pending: string[];
};

export type Direction = {
  id: string;
  title: string;
  programs: string[];
};
